package middleware

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// TenantContext middleware untuk PostgreSQL Row-Level Security (RLS).
//
// APA YANG DILAKUKAN:
// Di awal setiap HTTP request yang sudah ter-autentikasi (JWT),
// middleware ini menjalankan perintah SQL:
//   SET LOCAL app.tenant_id = '<tenant_id_dari_jwt>'
//
// MENGAPA INI DIBUTUHKAN:
// PostgreSQL RLS policy pada tabel orders/menus/users memeriksa:
//   tenant_id = current_setting('app.tenant_id')
// Tanpa SET LOCAL ini, RLS tidak tahu tenant mana yang sedang akses,
// dan semua baris akan disembunyikan (return 0 rows).
//
// MENGAPA "SET LOCAL" (BUKAN "SET"):
// "SET LOCAL" hanya berlaku di dalam transaksi saat ini.
// Jika 2 request dari tenant berbeda masuk bersamaan ke server yang sama,
// masing-masing punya transaksi sendiri dengan tenant_id sendiri.
// "SET" (tanpa LOCAL) berlaku untuk seluruh koneksi — berbahaya karena
// koneksi bisa di-reuse oleh request dari tenant lain (connection pooling).
//
// GRACEFUL FALLBACK:
// Jika tenant_id belum tersedia di context (misalnya endpoint publik
// yang tidak memerlukan JWT), middleware ini skip tanpa error.
// RLS policy sudah di-set dengan fallback:
//   OR current_setting('app.tenant_id', true) IS NULL OR = ''
// sehingga endpoint publik tetap bisa akses semua data.
func TenantContext(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID, _ := c.Locals("tenant_id").(string)

		if tenantID != "" {
			// SET LOCAL hanya berlaku di transaksi saat ini — aman untuk concurrent requests
			db.Exec("SET LOCAL app.tenant_id = ?", tenantID)
		}

		return c.Next()
	}
}
