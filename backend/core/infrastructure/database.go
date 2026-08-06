package infrastructure

import (
	"fmt"
	"log"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// ConnectDB menginisialisasi koneksi ke PostgreSQL via GORM dengan Connection Pooling
func ConnectDB() (*gorm.DB, error) {
	host := getEnv("POSTGRES_HOST", "localhost")
	user := getEnv("POSTGRES_USER", "nexus_db")
	password := getEnv("POSTGRES_PASSWORD", "bh99zBWTXhY5")
	dbname := getEnv("POSTGRES_DB", "nexus")
	port := getEnv("POSTGRES_PORT", "5432")

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Jakarta",
		host, user, password, dbname, port)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("gagal mendapatkan sql.DB dari GORM: %w", err)
	}

	// Application-Level Connection Pooling (database/sql)
	// Mencegah kebocoran koneksi dan kehabisan max_connections di PostgreSQL
	sqlDB.SetMaxOpenConns(25)                  // Maksimal 25 koneksi aktif simultan
	sqlDB.SetMaxIdleConns(10)                  // Maksimal 10 koneksi idle tetap terbuka
	sqlDB.SetConnMaxLifetime(30 * time.Minute) // Daur ulang koneksi setiap 30 menit
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)  // Tutup koneksi idle jika tidak terpakai > 5 menit

	log.Println("Berhasil terhubung ke PostgreSQL (Application Connection Pool disetel: MaxOpen=25, MaxIdle=10)")
	return db, nil
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
