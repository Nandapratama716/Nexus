package main

import (
	"log"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"

	delivery "github.com/nanda/nexus/core/delivery/http"
	ws "github.com/nanda/nexus/core/delivery/ws"
	"github.com/nanda/nexus/core/infrastructure"
	"github.com/nanda/nexus/core/repository"
	"github.com/nanda/nexus/core/usecase"
)

func main() {
	// 0. Load .env file (dari root project)
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("Warning: tidak menemukan file .env, menggunakan default env vars")
	}

	// 1. Infrastructure — koneksi DB dan Redis
	db, err := infrastructure.ConnectDB()
	if err != nil {
		log.Fatalf("Gagal koneksi DB: %v", err)
	}

	_, err = infrastructure.ConnectRedis()
	if err != nil {
		log.Fatalf("Gagal koneksi Redis: %v", err)
	}

	// 2. Repositories (injeksi db)
	userRepo := repository.NewUserRepository(db)
	menuRepo := repository.NewMenuRepository(db)
	orderRepo := repository.NewOrderRepository(db)

	// 3. Usecases (injeksi repositories)
	authUC := usecase.NewAuthUsecase(userRepo)
	menuUC := usecase.NewMenuUsecase(menuRepo)
	orderUC := usecase.NewOrderUsecase(orderRepo, menuRepo)

	// 4. WebSocket Hub & Mock Midtrans
	hub := ws.NewHub()
	go hub.Run()

	mockMidtrans := infrastructure.NewMockMidtransClient("SB-Mid-server-MOCK-KEY-12345")

	// 5. Fiber App
	app := fiber.New(fiber.Config{
		AppName: "Nexus Core Service v1.0",
	})

	app.Use(logger.New())
	app.Use(recover.New())

	// 6. HTTP Handlers (injeksi usecases)
	delivery.NewAuthHandler(app, authUC)
	delivery.NewMenuHandler(app, menuUC)
	delivery.NewOrderHandler(app, orderUC)
	delivery.NewPaymentHandler(app, orderUC, mockMidtrans)

	// 7. WebSocket endpoint untuk KDS
	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})
	app.Get("/ws/kds", websocket.New(ws.ServeWS(hub)))

	// 8. Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "nexus-core"})
	})

	log.Fatal(app.Listen(":8080"))
}
