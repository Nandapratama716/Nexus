package http

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/nanda/nexus/core/domain"
	"github.com/nanda/nexus/core/infrastructure"
)

type PaymentHandler struct {
	OrderUsecase   domain.OrderUsecase
	MidtransClient *infrastructure.MidtransClient
}

func NewPaymentHandler(app fiber.Router, orderUsecase domain.OrderUsecase, midtransClient *infrastructure.MidtransClient) {
	handler := &PaymentHandler{
		OrderUsecase:   orderUsecase,
		MidtransClient: midtransClient,
	}

	api := app.Group("/api/v1/payment")
	api.Post("/callback", handler.HandleMidtransCallback)
}

func (h *PaymentHandler) HandleMidtransCallback(c *fiber.Ctx) error {
	var payload map[string]interface{}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid payload"})
	}

	orderID, _ := payload["order_id"].(string)
	statusCode, _ := payload["status_code"].(string)
	grossAmount, _ := payload["gross_amount"].(string)
	signatureKey, _ := payload["signature_key"].(string)
	transactionStatus, _ := payload["transaction_status"].(string)

	log.Printf("[Midtrans Webhook] Update transaksi untuk Order %s (Status: %s)\n", orderID, transactionStatus)

	// Verifikasi HMAC SHA512 Signature jika signatureKey disertakan oleh Midtrans
	if signatureKey != "" && h.MidtransClient != nil {
		isValid := h.MidtransClient.VerifySignatureKey(signatureKey, orderID, statusCode, grossAmount)
		if !isValid {
			log.Printf("[Midtrans Webhook Security Alert] Invalid HMAC SHA512 Signature Key untuk Order: %s", orderID)
			if h.MidtransClient.IsProduction {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Invalid HMAC SHA512 Signature Key"})
			}
		} else {
			log.Printf("[Midtrans Webhook] Signature Key terverifikasi valid (SHA512).")
		}
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
		log.Printf("[Webhook Error] Gagal update order status: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal update status pembayaran order"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "ok"})
}
