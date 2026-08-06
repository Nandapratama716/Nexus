package infrastructure

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

// Migrator menjalankan versioned database migrations secara eksplisit.
//
// MENGAPA INI DIBUTUHKAN:
// AutoMigrate() GORM hanya bisa menambah kolom/tabel baru, tapi TIDAK BISA:
//   - Menghapus kolom yang sudah tidak dipakai
//   - Mengubah nama kolom (rename)
//   - Mengubah tipe data kolom
//   - Melakukan rollback jika migration gagal setengah jalan
//
// Dengan golang-migrate, setiap perubahan schema menjadi file .sql eksplisit
// yang bisa di-review di code review, di-rollback, dan dijalankan berurutan.
// Ini standar industri untuk production database management.
type Migrator struct {
	m *migrate.Migrate
}

// NewMigrator membuat instance migrator dari direktori migration files
func NewMigrator(sqlDB *sql.DB, migrationsPath string) (*Migrator, error) {
	driver, err := postgres.WithInstance(sqlDB, &postgres.Config{})
	if err != nil {
		return nil, fmt.Errorf("gagal membuat driver postgres untuk migration: %w", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file://"+migrationsPath,
		"postgres",
		driver,
	)
	if err != nil {
		return nil, fmt.Errorf("gagal inisialisasi migrator: %w", err)
	}

	return &Migrator{m: m}, nil
}

// Up menjalankan semua migration yang belum dijalankan (maju ke versi terbaru)
func (mg *Migrator) Up() error {
	err := mg.m.Up()
	if err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("migration up gagal: %w", err)
	}
	if err == migrate.ErrNoChange {
		log.Println("[Migrator] Schema sudah up-to-date, tidak ada migration baru.")
	} else {
		version, dirty, _ := mg.m.Version()
		log.Printf("[Migrator] Migration berhasil. Versi saat ini: %d (dirty: %v)", version, dirty)
	}
	return nil
}

// Down melakukan rollback 1 step ke versi sebelumnya
func (mg *Migrator) Down() error {
	err := mg.m.Steps(-1)
	if err != nil {
		return fmt.Errorf("migration rollback gagal: %w", err)
	}
	version, _, _ := mg.m.Version()
	log.Printf("[Migrator] Rollback berhasil. Versi saat ini: %d", version)
	return nil
}

// Version mengembalikan versi migration saat ini
func (mg *Migrator) Version() (uint, bool, error) {
	return mg.m.Version()
}
