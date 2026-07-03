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

	orders := app.Group("/api/v1/orders", middleware.JWTProtected())
	orders.Post("/", handler.Create)
	orders.Get("/me", handler.GetMyOrders)
	orders.Get("/:id", handler.GetByID)

	// Staff/Admin: update status pesanan (KDS)
	orders.Patch("/:id/status", middleware.RequireRole("admin", "staff"), handler.UpdateStatus)
	orders.Get("/active", middleware.RequireRole("admin", "staff"), handler.GetActive)
}

type createOrderRequest struct {
	TableNumber string `json:"table_number"`
	Notes       string `json:"notes"`
	Items       []struct {
		MenuID   string `json:"menu_id"`
		Quantity int    `json:"quantity"`
	} `json:"items"`
}

type updateStatusRequest struct {
	Status string `json:"status"`
}

func (h *OrderHandler) Create(c *fiber.Ctx) error {
	var req createOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format JSON tidak valid"})
	}

	userID, _ := c.Locals("user_id").(string)
	items := make([]domain.OrderItem, len(req.Items))
	for i, item := range req.Items {
		items[i] = domain.OrderItem{
			MenuID:   item.MenuID,
			Quantity: item.Quantity,
		}
	}

	order := &domain.Order{
		UserID:      userID,
		TableNumber: req.TableNumber,
		Notes:       req.Notes,
		Items:       items,
	}

	if err := h.orderUsecase.CreateOrder(c.Context(), order); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(order)
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
