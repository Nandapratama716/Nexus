package domain

import (
	"context"
	"time"
)

// OrderStatus status siklus pesanan
type OrderStatus string

const (
	StatusPending    OrderStatus = "pending"
	StatusPreparing  OrderStatus = "preparing"
	StatusReady      OrderStatus = "ready"
	StatusDone       OrderStatus = "done"
	StatusCancelled  OrderStatus = "cancelled"
)

// PaymentStatus status pembayaran
type PaymentStatus string

const (
	PaymentPending    PaymentStatus = "pending"
	PaymentSettled    PaymentStatus = "settled"
	PaymentExpired    PaymentStatus = "expired"
	PaymentCancelled  PaymentStatus = "cancelled"
)

// PaymentMethod metode pembayaran
type PaymentMethod string

const (
	PaymentCash PaymentMethod = "cash"
	PaymentQRIS PaymentMethod = "qris"
)

// OrderType tipe pesanan
type OrderType string

const (
	OrderDineIn   OrderType = "dine_in"
	OrderTakeaway OrderType = "takeaway"
)

// OrderItem item dalam pesanan (Value Object)
type OrderItem struct {
	MenuID   string  `json:"menu_id"`
	MenuName string  `json:"menu_name"`
	Quantity int     `json:"quantity"`
	Price    float64 `json:"price"`    // snapshot harga saat order dibuat
	Subtotal float64 `json:"subtotal"` // Price * Quantity
	Notes    string  `json:"notes"`    // catatan per-item: "pedas level 3, tanpa bawang"
}

// Order entity murni
type Order struct {
	ID            string        `json:"id"`
	UserID        string        `json:"user_id"`
	TableNumber   string        `json:"table_number"`
	Items         []OrderItem   `json:"items" gorm:"serializer:json"`
	TotalAmount   float64       `json:"total_amount"`
	Status        OrderStatus   `json:"status"`
	PaymentStatus PaymentStatus `json:"payment_status"`
	PaymentMethod PaymentMethod `json:"payment_method"` // cash / qris
	PaymentID     string        `json:"payment_id"`     // Midtrans transaction ID
	QRISUrl       string        `json:"qris_url"`       // URL gambar QRIS dari Midtrans
	CashPaid      float64       `json:"cash_paid"`      // uang diterima dari pelanggan
	CashChange    float64       `json:"cash_change"`    // kembalian
	OrderType     OrderType     `json:"order_type"`     // dine_in / takeaway
	Notes         string        `json:"notes"`
	CreatedAt     time.Time     `json:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at"`
}

// OrderRepository interface injeksi ke usecase
type OrderRepository interface {
	Create(ctx context.Context, order *Order) error
	GetByID(ctx context.Context, id string) (*Order, error)
	GetByUserID(ctx context.Context, userID string) ([]Order, error)
	GetAllActive(ctx context.Context) ([]Order, error) // untuk KDS
	UpdateStatus(ctx context.Context, id string, status OrderStatus) error
	UpdatePaymentStatus(ctx context.Context, id string, paymentStatus PaymentStatus, paymentID string) error
}

// OrderUsecase interface injeksi ke delivery
type OrderUsecase interface {
	CreateOrder(ctx context.Context, order *Order) error
	GetOrder(ctx context.Context, id string) (*Order, error)
	GetUserOrders(ctx context.Context, userID string) ([]Order, error)
	GetActiveOrders(ctx context.Context) ([]Order, error) // KDS
	UpdateOrderStatus(ctx context.Context, id string, status OrderStatus) error
	HandlePaymentWebhook(ctx context.Context, orderID string, status PaymentStatus) error
}
