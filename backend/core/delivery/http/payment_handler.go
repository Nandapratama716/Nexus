package http

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/nanda/nexus/core/domain"
	"github.com/nanda/nexus/core/infrastructure"
)

type PaymentHandler struct {
	OrderUsecase   domain.OrderUsecase
	MidtransClient *infrastructure.MockMidtransClient
}

func NewPaymentHandler(app *fiber.App, orderUsecase domain.OrderUsecase, midtransClient *infrastructure.MockMidtransClient) {
	handler := &PaymentHandler{
		OrderUsecase:   orderUsecase,
		MidtransClient: midtransClient,
	}

	api := app.Group("/api/v1/payment")
	api.Post("/callback", handler.HandleMidtransCallback)
}

func (h *PaymentHandler) HandleMidtransCallback(c *fiber.Ctx) error {
	// Midtrans mengirimkan JSON payload
	var payload map[string]interface{}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid payload"})
	}

	// Ambil field penting
	orderID, _ := payload["order_id"].(string)
	statusCode, _ := payload["status_code"].(string)
	grossAmount, _ := payload["gross_amount"].(string)
	signatureKey, _ := payload["signature_key"].(string)
	transactionStatus, _ := payload["transaction_status"].(string)

	log.Printf("[Webhook] Menerima update untuk Order %s (Status: %s)\n", orderID, transactionStatus)

	// Verifikasi Signature (Mock)
	isValid := h.MidtransClient.VerifySignatureKey(signatureKey, orderID, statusCode, grossAmount)
	if !isValid {
		log.Println("[Webhook] Error: Invalid Signature")
		// Dalam production, kembalikan 403. Di sini kita log saja agar mudah ditest lokal
		// return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "invalid signature"})
	}

	// Map status Midtrans ke PaymentStatus domain
	var status domain.PaymentStatus
	switch transactionStatus {
	case "settlement", "capture":
		status = domain.PaymentSettled
	case "expire":
		status = domain.PaymentExpired
	case "cancel", "deny":
		status = domain.PaymentCancelled
	default:
		status = domain.PaymentPending
	}

	// Update via usecase
	err := h.OrderUsecase.HandlePaymentWebhook(c.Context(), orderID, status)
	if err != nil {
		log.Printf("[Webhook] Error updating order: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal update order"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "ok"})
}
