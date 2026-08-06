package ws

import (
	"context"
	"log"
	"sync"

	"github.com/gofiber/contrib/websocket"
	"github.com/redis/go-redis/v9"
)

const RedisKDSEventsChannel = "nexus:kds:events"

// Client representasi koneksi KDS yang terhubung
type Client struct {
	conn *websocket.Conn
	send chan []byte
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
			log.Printf("KDS client terhubung. Total: %d", len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			log.Printf("KDS client terputus. Total: %d", len(h.clients))

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
			// Buffer penuh — hapus client yang lambat
			close(client.send)
			delete(h.clients, client)
		}
	}
}

// Broadcast kirim pesan ke semua KDS client yang terhubung (Pub/Sub Redis jika terhubung)
func (h *Hub) Broadcast(message []byte) {
	if h.rdb != nil {
		if err := h.rdb.Publish(context.Background(), RedisKDSEventsChannel, message).Err(); err != nil {
			log.Printf("[Redis Pub/Sub] Error publishing message: %v", err)
			h.broadcast <- message // fallback lokal
		}
	} else {
		h.broadcast <- message
	}
}

// ServeWS upgrade HTTP ke WebSocket dan register client ke hub
func ServeWS(hub *Hub) func(*websocket.Conn) {
	return func(conn *websocket.Conn) {
		client := &Client{
			conn: conn,
			send: make(chan []byte, 256),
		}

		hub.register <- client

		// Goroutine: kirim pesan dari channel ke koneksi WS
		go func() {
			defer func() {
				hub.unregister <- client
				conn.Close()
			}()
			for msg := range client.send {
				if err := conn.WriteMessage(1, msg); err != nil {
					return
				}
			}
		}()

		// Goroutine utama: baca pesan dari client (untuk keep-alive / ping)
		defer func() {
			hub.unregister <- client
			conn.Close()
		}()
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				break
			}
		}
	}
}
