package infrastructure

import (
	"context"
	"encoding/json"
	"log"

	"github.com/redis/go-redis/v9"
)

const menuStreamKey = "nexus:menu_stream"

// MenuStreamPublisher publishes menu CRUD events ke Redis Stream
// untuk dikonsumsi oleh AI Service (Python).
type MenuStreamPublisher struct {
	rdb *redis.Client
}

// NewMenuStreamPublisher membuat publisher baru.
func NewMenuStreamPublisher(rdb *redis.Client) *MenuStreamPublisher {
	return &MenuStreamPublisher{rdb: rdb}
}

// Publish mengirimkan event ke stream nexus:menu_stream.
//
// action: "create" | "update" | "delete"
// menuID: UUID menu
// payload: domain.Menu struct (opsional, nil untuk delete)
func (p *MenuStreamPublisher) Publish(ctx context.Context, action, menuID string, payload interface{}) {
	var payloadJSON string
	if payload != nil {
		b, err := json.Marshal(payload)
		if err != nil {
			log.Printf("[MenuStream] Error marshaling payload: %v", err)
			return
		}
		payloadJSON = string(b)
	}

	args := &redis.XAddArgs{
		Stream: menuStreamKey,
		MaxLen: 1000, // trim stream agar tidak tumbuh tak terbatas
		Approx: true,
		Values: map[string]interface{}{
			"action":  action,
			"menu_id": menuID,
			"payload": payloadJSON,
		},
	}

	if err := p.rdb.XAdd(ctx, args).Err(); err != nil {
		log.Printf("[MenuStream] Error publishing '%s' for menu %s: %v", action, menuID, err)
		return
	}

	log.Printf("[MenuStream] Published '%s' for menu %s", action, menuID)
}
