package ws

import (
	"log"
	"sync"

	"github.com/gofiber/contrib/websocket"
)

// Client representasi koneksi KDS yang terhubung
type Client struct {
	conn *websocket.Conn
	send chan []byte
}

// Hub mengelola semua koneksi WebSocket aktif (in-memory)
// Catatan Arsitektur: Implementasi ini menggunakan in-memory hub untuk kesederhanaan.
// Untuk horizontal scaling (multi-instance), hub dapat dimigrasi ke adapter Redis Pub/Sub.
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
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
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					// Buffer penuh — hapus client yang lambat
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Broadcast kirim pesan ke semua KDS client yang terhubung
func (h *Hub) Broadcast(message []byte) {
	h.broadcast <- message
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
