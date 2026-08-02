package http

import (
	"encoding/json"
	"sync"

	"github.com/gofiber/fiber/v2"
	"github.com/nanda/nexus/core/delivery/ws"
	"github.com/nanda/nexus/core/domain"
	"github.com/nanda/nexus/core/middleware"
)

var (
	vacatedTablesMu sync.RWMutex
	vacatedTables   = make(map[string]bool)
)

type OrderHandler struct {
	orderUsecase domain.OrderUsecase
	hub          *ws.Hub
}

func NewOrderHandler(app fiber.Router, us domain.OrderUsecase, hub ...*ws.Hub) {
	handler := &OrderHandler{orderUsecase: us}
	if len(hub) > 0 {
		handler.hub = hub[0]
	}

	// Customer & Kitchen orders (Static routes must be declared before parameterized /:id)
	orders := app.Group("/api/v1/orders")
	orders.Get("/active", handler.GetActive)
	orders.Get("/tables/occupied", handler.GetOccupiedTables)
	orders.Post("/tables/:table/vacate", handler.VacateTable)
	orders.Get("/me", middleware.JWTProtected(), handler.GetMyOrders)
	orders.Post("/", handler.Create)

	// Parameterized routes
	orders.Get("/:id", handler.GetByID)
	orders.Patch("/:id/status", handler.UpdateStatus)

	// Cashier POS: input order manual & terima cash (Kitchen terisolasi dari endpoint ini)
	cashier := app.Group("/api/v1/cashier", middleware.JWTProtected(), middleware.RequireRole("admin", "manager", "cashier"))
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
	PromoCode     string             `json:"promo_code"`     // e.g. NEXUS10, HEMAT5K
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

	// Reset status pengosongan meja untuk meja ini saat ada order baru
	if req.TableNumber != "" {
		vacatedTablesMu.Lock()
		delete(vacatedTables, req.TableNumber)
		vacatedTablesMu.Unlock()
	}

	// Broadcast ke KDS via WebSocket
	if h.hub != nil {
		payload, _ := json.Marshal(fiber.Map{
			"type":    "new_order",
			"payload": order,
		})
		h.hub.Broadcast(payload)
	}

	return c.Status(fiber.StatusCreated).JSON(order)
}

// CashierCreate — kasir/staff membuat order atas nama pelanggan
func (h *OrderHandler) CashierCreate(c *fiber.Ctx) error {
	var req createOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format JSON tidak valid"})
	}

	cashierID, _ := c.Locals("user_id").(string)
	order := h.buildOrder(req, cashierID)

	if err := h.orderUsecase.CreateOrder(c.Context(), order); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	// Reset status pengosongan meja untuk meja ini saat ada order baru
	if req.TableNumber != "" {
		vacatedTablesMu.Lock()
		delete(vacatedTables, req.TableNumber)
		vacatedTablesMu.Unlock()
	}

	// Broadcast ke KDS via WebSocket
	if h.hub != nil {
		payload, _ := json.Marshal(fiber.Map{
			"type":    "new_order",
			"payload": order,
		})
		h.hub.Broadcast(payload)
	}

	return c.Status(fiber.StatusCreated).JSON(order)
}

// buildOrder — shared builder dari request ke domain.Order
func (h *OrderHandler) buildOrder(req createOrderRequest, userID string) *domain.Order {
	if userID == "" {
		userID = "guest"
	}
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
		PromoCode:     req.PromoCode,
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

	orderID := c.Params("id")
	if err := h.orderUsecase.UpdateOrderStatus(
		c.Context(),
		orderID,
		domain.OrderStatus(req.Status),
	); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	// Broadcast ke KDS via WebSocket
	if h.hub != nil {
		updatedOrder, _ := h.orderUsecase.GetOrder(c.Context(), orderID)
		if updatedOrder != nil {
			payload, _ := json.Marshal(fiber.Map{
				"type":    "update_order",
				"payload": updatedOrder,
			})
			h.hub.Broadcast(payload)
		}
	}

	return c.JSON(fiber.Map{"message": "Status pesanan diperbarui"})
}

func (h *OrderHandler) GetOccupiedTables(c *fiber.Ctx) error {
	orders, err := h.orderUsecase.GetActiveOrders(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	vacatedTablesMu.RLock()
	defer vacatedTablesMu.RUnlock()

	occupiedMap := make(map[string]bool)
	for _, o := range orders {
		// Abaikan pesanan Takeaway/Bungkus dan meja yang sudah secara resmi dikosongkan/di-vacate oleh waiter
		if o.TableNumber != "" && o.TableNumber != "Takeaway" && o.TableNumber != "Bungkus" && o.TableNumber != "-" && o.OrderType != domain.OrderTakeaway {
			if !vacatedTables[o.TableNumber] {
				occupiedMap[o.TableNumber] = true
			}
		}
	}
	tables := make([]string, 0, len(occupiedMap))
	for t := range occupiedMap {
		tables = append(tables, t)
	}
	return c.JSON(tables)
}

func (h *OrderHandler) VacateTable(c *fiber.Ctx) error {
	tableNumber := c.Params("table")
	if tableNumber == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Nomor meja tidak valid"})
	}

	vacatedTablesMu.Lock()
	vacatedTables[tableNumber] = true
	vacatedTablesMu.Unlock()

	return c.JSON(fiber.Map{"message": "Meja " + tableNumber + " berhasil dikosongkan"})
}
