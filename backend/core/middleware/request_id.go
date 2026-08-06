package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

const HeaderXRequestID = "X-Request-ID"

// RequestID middleware yang menghasilkan atau mempropagasi X-Request-ID pada setiap request HTTP.
//
// MENGAPA INI DIBUTUHKAN:
// Distributed tracing & observability. Dalam arsitektur microservices terdistribusi,
// satu interaksi pengguna (misal: order di HP) akan melewati banyak layer (Mobile -> Go Core -> Postgres -> Redis -> Python AI).
// X-Request-ID berfungsi sebagai ID pelacak unik yang melekat pada seluruh entri log untuk request tersebut.
func RequestID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		reqID := c.Get(HeaderXRequestID)
		if reqID == "" {
			reqID = uuid.New().String()
		}

		c.Set(HeaderXRequestID, reqID)
		c.Locals("request_id", reqID)

		return c.Next()
	}
}
