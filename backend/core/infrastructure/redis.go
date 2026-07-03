package infrastructure

import (
	"context"
	"log"

	"github.com/redis/go-redis/v9"
)

// ConnectRedis menginisialisasi client Redis
func ConnectRedis() (*redis.Client, error) {
	host := getEnv("REDIS_HOST", "localhost")
	port := getEnv("REDIS_PORT", "6379")

	rdb := redis.NewClient(&redis.Options{
		Addr:     host + ":" + port,
		Password: "", // tanpa password lokal
		DB:       0,  // DB default
	})

	// Ping untuk memastikan koneksi aktif
	_, err := rdb.Ping(context.Background()).Result()
	if err != nil {
		return nil, err
	}

	log.Println("Berhasil terhubung ke Redis")
	return rdb, nil
}
