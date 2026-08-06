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

	log.Printf("[Midtrans Webhook] Menerima notifikasi untuk Order: %s (Status: %s)\n", orderID, transactionStatus)

	if orderID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "order_id wajib ada"})
	}

	// 1. Idempotency Check: Cek apakah order sudah settled sebelumnya
	existingOrder, err := h.OrderUsecase.GetOrder(c.Context(), orderID)
	if err == nil && existingOrder != nil {
		if existingOrder.PaymentStatus == domain.PaymentSettled {
			log.Printf("[Midtrans Webhook Idempotent] Order %s sudah berstatus settled, skip proses ulang.\n", orderID)
			return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "order already settled (idempotent)"})
		}
	}

	// 2. Verifikasi HMAC SHA512 Signature
	if signatureKey != "" && h.MidtransClient != nil {
		isValid := h.MidtransClient.VerifySignatureKey(signatureKey, orderID, statusCode, grossAmount)
		if !isValid {
			log.Printf("[Midtrans Webhook Security Alert] Invalid HMAC SHA512 Signature Key untuk Order: %s", orderID)
			if h.MidtransClient.IsProduction {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Invalid HMAC SHA512 Signature Key"})
			}
		} else {
			log.Printf("[Midtrans Webhook] HMAC SHA512 Signature Key terverifikasi valid.")
		}
	}

	// 3. Defense-in-depth: Verifikasi langsung ke Midtrans Transaction Status API (di Production)
	if h.MidtransClient != nil && h.MidtransClient.IsProduction {
		statusResp, err := h.MidtransClient.CheckTransactionStatus(orderID)
		if err == nil && statusResp != nil && statusResp.TransactionStatus != "" {
			log.Printf("[Midtrans Status API Verified] Confirmed status dari API Midtrans: %s (Body: %s)", statusResp.TransactionStatus, transactionStatus)
			transactionStatus = statusResp.TransactionStatus
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

	// Update status via usecase
	err = h.OrderUsecase.HandlePaymentWebhook(c.Context(), orderID, status)
	if err != nil {
		log.Printf("[Webhook Error] Gagal update order status: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal update status pembayaran order"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "ok"})
}
