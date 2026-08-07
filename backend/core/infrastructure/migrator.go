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
// Jika terjadi dirty database state (misal akibat interupsi sebelumnya),
// migrator secara otomatis melakukan Force & retry secara aman.
func (mg *Migrator) Up() error {
	version, dirty, errVer := mg.m.Version()
	if errVer == nil && dirty {
		log.Printf("[Migrator Warning] Database berada dalam kondisi dirty (versi %d). Melakukan auto-clearing dirty flag...", version)
		if errForce := mg.m.Force(int(version)); errForce != nil {
			return fmt.Errorf("gagal force version %d: %w", version, errForce)
		}
	}

	err := mg.m.Up()
	if err != nil && err != migrate.ErrNoChange {
		// Jika err mengembalikan dirty version error, coba force dan retry sekali lagi
		if v, d, _ := mg.m.Version(); d {
			log.Printf("[Migrator Warning] Retry migration up setelah reset dirty version %d...", v)
			_ = mg.m.Force(int(v))
			err = mg.m.Up()
		}
	}

	if err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("migration up gagal: %w", err)
	}

	if err == migrate.ErrNoChange {
		log.Println("[Migrator] Schema sudah up-to-date, tidak ada migration baru.")
	} else {
		currVer, isDirty, _ := mg.m.Version()
		log.Printf("[Migrator] Migration berhasil. Versi saat ini: %d (dirty: %v)", currVer, isDirty)
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
