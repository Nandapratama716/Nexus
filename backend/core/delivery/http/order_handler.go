package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nanda/nexus/core/domain"
	"github.com/nanda/nexus/core/middleware"
)

type OrderHandler struct {
	orderUsecase domain.OrderUsecase
}

func NewOrderHandler(app fiber.Router, us domain.OrderUsecase) {
	handler := &OrderHandler{orderUsecase: us}

	// Customer orders (butuh JWT)
	orders := app.Group("/api/v1/orders", middleware.JWTProtected())
	orders.Post("/", handler.Create)
	orders.Get("/me", handler.GetMyOrders)
	orders.Get("/:id", handler.GetByID)

	// Staff/Admin: update status pesanan (KDS)
	orders.Patch("/:id/status", middleware.RequireRole("admin", "staff"), handler.UpdateStatus)
	orders.Get("/active", middleware.RequireRole("admin", "staff"), handler.GetActive)

	// Cashier POS: input order manual atas nama pelanggan
	cashier := app.Group("/api/v1/cashier", middleware.JWTProtected(), middleware.RequireRole("admin", "staff", "cashier"))
	cashier.Post("/orders", handler.CashierCreate)
}

type orderItemRequest struct {
	MenuID   string `json:"menu_id"`
	Quantity int    `json:"quantity"`
	Notes    string `json:"notes"` // catatan per-item: "pedas level 3, tanpa bawang"
}

type createOrderRequest struct {
	TableNumber   string             `json:"table_number"`
	Notes         string             `json:"notes"`
	OrderType     string             `json:"order_type"`     // dine_in / takeaway
	PaymentMethod string             `json:"payment_method"` // cash / qris
	CashPaid      float64            `json:"cash_paid"`      // uang diterima (jika cash)
	Items         []orderItemRequest `json:"items"`
}

type updateStatusRequest struct {
	Status string `json:"status"`
}

// Create — customer membuat order sendiri (via Mobile App)
func (h *OrderHandler) Create(c *fiber.Ctx) error {
	var req createOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format JSON tidak valid"})
	}

	userID, _ := c.Locals("user_id").(string)
	order := h.buildOrder(req, userID)

	if err := h.orderUsecase.CreateOrder(c.Context(), order); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(order)
}

// CashierCreate — kasir/staff membuat order atas nama pelanggan
func (h *OrderHandler) CashierCreate(c *fiber.Ctx) error {
	var req createOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format JSON tidak valid"})
	}

	// Kasir input order → user_id diambil dari JWT kasir (sebagai pencatat)
	cashierID, _ := c.Locals("user_id").(string)
	order := h.buildOrder(req, cashierID)

	if err := h.orderUsecase.CreateOrder(c.Context(), order); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(order)
}

// buildOrder — shared builder dari request ke domain.Order
func (h *OrderHandler) buildOrder(req createOrderRequest, userID string) *domain.Order {
	items := make([]domain.OrderItem, len(req.Items))
	for i, item := range req.Items {
		items[i] = domain.OrderItem{
			MenuID:   item.MenuID,
			Quantity: item.Quantity,
			Notes:    item.Notes,
		}
	}

	return &domain.Order{
		UserID:        userID,
		TableNumber:   req.TableNumber,
		Notes:         req.Notes,
		OrderType:     domain.OrderType(req.OrderType),
		PaymentMethod: domain.PaymentMethod(req.PaymentMethod),
		CashPaid:      req.CashPaid,
		Items:         items,
	}
}

func (h *OrderHandler) GetByID(c *fiber.Ctx) error {
	order, err := h.orderUsecase.GetOrder(c.Context(), c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(order)
}

func (h *OrderHandler) GetMyOrders(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	orders, err := h.orderUsecase.GetUserOrders(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(orders)
}

func (h *OrderHandler) GetActive(c *fiber.Ctx) error {
	orders, err := h.orderUsecase.GetActiveOrders(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(orders)
}

func (h *OrderHandler) UpdateStatus(c *fiber.Ctx) error {
	var req updateStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format JSON tidak valid"})
	}

	if err := h.orderUsecase.UpdateOrderStatus(
		c.Context(),
		c.Params("id"),
		domain.OrderStatus(req.Status),
	); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Status pesanan diperbarui"})
}
