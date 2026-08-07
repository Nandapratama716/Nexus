package ws

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/redis/go-redis/v9"
)

const (
	RedisKDSEventsChannel = "nexus:kds:events"
	writeWait             = 10 * time.Second
	pongWait              = 60 * time.Second
	pingPeriod            = (pongWait * 9) / 10
)

// Client representasi koneksi KDS WebSocket yang terhubung
type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
	once sync.Once
}

func (c *Client) close() {
	c.once.Do(func() {
		c.hub.unregister <- c
		_ = c.conn.Close()
	})
}

// Hub mengelola semua koneksi WebSocket aktif (in-memory & terdistribusi via Redis Pub/Sub)
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	rdb        *redis.Client
	mu         sync.RWMutex
}

func NewHub(rdb ...*redis.Client) *Hub {
	var redisClient *redis.Client
	if len(rdb) > 0 {
		redisClient = rdb[0]
	}

	h := &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		rdb:        redisClient,
	}

	// Jika Redis Client tersedia, berlangganan ke Redis Pub/Sub Channel
	if h.rdb != nil {
		go h.listenRedisPubSub()
	}

	return h
}

// listenRedisPubSub mendengarkan event dari Redis Pub/Sub untuk distributed broadcasting
func (h *Hub) listenRedisPubSub() {
	pubsub := h.rdb.Subscribe(context.Background(), RedisKDSEventsChannel)
	defer pubsub.Close()

	ch := pubsub.Channel()
	log.Println("[Redis Pub/Sub] Berhasil mendengarkan channel:", RedisKDSEventsChannel)

	for msg := range ch {
		h.broadcastLocal([]byte(msg.Payload))
	}
}

// Run menjalankan event loop hub (dijalankan sebagai goroutine)
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("[WebSocket Hub] KDS client terhubung. Total client aktif: %d", len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				log.Printf("[WebSocket Hub] KDS client terputus. Sisa client aktif: %d", len(h.clients))
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.broadcastLocal(message)
		}
	}
}

func (h *Hub) broadcastLocal(message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for client := range h.clients {
		select {
		case client.send <- message:
		default:
			// Buffer penuh — hapus zombie client yang lambat
			delete(h.clients, client)
			close(client.send)
		}
	}
}

// Broadcast kirim pesan ke semua KDS client yang terhubung (Pub/Sub Redis jika terhubung)
func (h *Hub) Broadcast(message []byte) {
	if h.rdb != nil {
		if err := h.rdb.Publish(context.Background(), RedisKDSEventsChannel, message).Err(); err != nil {
			log.Printf("[Redis Pub/Sub Error] Gagal publish message: %v", err)
			h.broadcast <- message // fallback lokal
		}
	} else {
		h.broadcast <- message
	}
}

// ServeWS upgrade HTTP ke WebSocket, register client ke hub, dan menangani Heartbeat Ping-Pong
func ServeWS(hub *Hub) func(*websocket.Conn) {
	return func(conn *websocket.Conn) {
		client := &Client{
			hub:  hub,
			conn: conn,
			send: make(chan []byte, 256),
		}

		hub.register <- client

		// Goroutine Write Loop + Heartbeat Ping Ticker
		go func() {
			ticker := time.NewTicker(pingPeriod)
			defer func() {
				ticker.Stop()
				client.close()
			}()

			for {
				select {
				case message, ok := <-client.send:
					_ = conn.SetWriteDeadline(time.Now().Add(writeWait))
					if !ok {
						// Channel ditutup oleh hub (unregister)
						_ = conn.WriteMessage(websocket.CloseMessage, []byte{})
						return
					}

					w, err := conn.NextWriter(websocket.TextMessage)
					if err != nil {
						return
					}
					_, _ = w.Write(message)

					// Flush semua pesan yang ada di buffer channel
					n := len(client.send)
					for i := 0; i < n; i++ {
						_, _ = w.Write([]byte("\n"))
						_, _ = w.Write(<-client.send)
					}

					if err := w.Close(); err != nil {
						return
					}

				case <-ticker.C:
					_ = conn.SetWriteDeadline(time.Now().Add(writeWait))
					if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
						return
					}
				}
			}
		}()

		// Goroutine Read Loop + Pong Deadline Reset (Zombie Cleanup Guard)
		defer client.close()

		_ = conn.SetReadDeadline(time.Now().Add(pongWait))
		conn.SetPongHandler(func(string) error {
			_ = conn.SetReadDeadline(time.Now().Add(pongWait))
			return nil
		})

		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				break
			}
		}
	}
}
