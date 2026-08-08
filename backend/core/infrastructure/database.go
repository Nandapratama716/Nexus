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
		Logger: logger.New(
			log.New(os.Stdout, "\r\n", log.LstdFlags),
			logger.Config{
				SlowThreshold:             200 * time.Millisecond, // Log query yang lambat > 200ms
				LogLevel:                  logger.Warn,            // Hanya warn + error (hemat log)
				IgnoreRecordNotFoundError: true,                   // Jangan log ErrRecordNotFound
				Colorful:                  false,
			},
		),
	})

	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("gagal mendapatkan sql.DB dari GORM: %w", err)
	}

	// Roadmap 2.5: Application-Level Connection Pooling
	// MaxOpenConns=50 sesuai kapasitas PgBouncer DEFAULT_POOL_SIZE=20 × 2 instance Go
	sqlDB.SetMaxOpenConns(50)                  // Maks 50 koneksi aktif simultan
	sqlDB.SetMaxIdleConns(10)                  // Maks 10 koneksi idle
	sqlDB.SetConnMaxLifetime(30 * time.Minute) // Daur ulang setiap 30 menit
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)  // Tutup idle jika tidak terpakai > 5 menit

	log.Println("Berhasil terhubung ke PostgreSQL (Connection Pool: MaxOpen=50, MaxIdle=10, Lifetime=30m)")
	return db, nil
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
