package repository

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/nanda/nexus/core/domain"
	"gorm.io/gorm"
)

// orderItemJSON helper untuk serialize []OrderItem ke JSONB
type orderItemJSON struct {
	MenuID   string  `json:"menu_id"`
	MenuName string  `json:"menu_name"`
	Quantity int     `json:"quantity"`
	Price    float64 `json:"price"`
	Subtotal float64 `json:"subtotal"`
}

// orderModel DB struct
type orderModel struct {
	ID             string  `gorm:"primaryKey;type:varchar(255)"`
	UserID         string  `gorm:"not null"`
	TableNumber    string
	Items          []byte  `gorm:"type:jsonb;not null"`
	Subtotal       float64
	DiscountAmount float64
	TaxAmount      float64
	ServiceCharge  float64
	TotalAmount    float64 `gorm:"not null"`
	Status         string  `gorm:"not null;default:'pending'"`
	PaymentStatus  string  `gorm:"not null;default:'pending'"`
	PaymentID      string
	QRISUrl        string
	Notes          string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

func (orderModel) TableName() string { return "orders" }

type orderRepository struct {
	db *gorm.DB
}

func NewOrderRepository(db *gorm.DB) domain.OrderRepository {
	return &orderRepository{db: db}
}

func (r *orderRepository) Create(ctx context.Context, o *domain.Order) error {
	itemsJSON, err := marshalItems(o.Items)
	if err != nil {
		return err
	}
	if o.ID == "" {
		o.ID = "order-" + uuid.New().String()
	}
	model := &orderModel{
		ID:             o.ID,
		UserID:         o.UserID,
		TableNumber:    o.TableNumber,
		Items:          itemsJSON,
		Subtotal:       o.Subtotal,
		DiscountAmount: o.DiscountAmount,
		TaxAmount:      o.TaxAmount,
		ServiceCharge:  o.ServiceCharge,
		TotalAmount:    o.TotalAmount,
		Status:         string(o.Status),
		PaymentStatus:  string(o.PaymentStatus),
		PaymentID:      o.PaymentID,
		QRISUrl:        o.QRISUrl,
		Notes:          o.Notes,
	}
	if err := r.db.WithContext(ctx).Create(model).Error; err != nil {
		return err
	}
	o.CreatedAt = model.CreatedAt
	o.UpdatedAt = model.UpdatedAt
	return nil
}

func (r *orderRepository) GetByID(ctx context.Context, id string) (*domain.Order, error) {
	var model orderModel
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&model).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("order tidak ditemukan")
		}
		return nil, err
	}
	return toOrderDomain(model)
}

func (r *orderRepository) GetByUserID(ctx context.Context, userID string) ([]domain.Order, error) {
	var models []orderModel
	if err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("created_at desc").Find(&models).Error; err != nil {
		return nil, err
	}
	orders := make([]domain.Order, len(models))
	for i, m := range models {
		ord, err := toOrderDomain(m)
		if err != nil {
			return nil, err
		}
		orders[i] = *ord
	}
	return orders, nil
}

func (r *orderRepository) GetAllActive(ctx context.Context) ([]domain.Order, error) {
	var models []orderModel
	// Status aktif: pending, preparing, ready (done dan cancelled disembunyikan dari KDS)
	activeStatuses := []string{string(domain.StatusPending), string(domain.StatusPreparing), string(domain.StatusReady)}
	if err := r.db.WithContext(ctx).Where("status IN ?", activeStatuses).Order("created_at asc").Find(&models).Error; err != nil {
		return nil, err
	}
	orders := make([]domain.Order, len(models))
	for i, m := range models {
		ord, err := toOrderDomain(m)
		if err != nil {
			return nil, err
		}
		orders[i] = *ord
	}
	return orders, nil
}

func (r *orderRepository) UpdateStatus(ctx context.Context, id string, status domain.OrderStatus) error {
	return r.db.WithContext(ctx).Model(&orderModel{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":     string(status),
			"updated_at": time.Now(),
		}).Error
}

func (r *orderRepository) UpdatePaymentStatus(ctx context.Context, id string, paymentStatus domain.PaymentStatus, paymentID string) error {
	updates := map[string]interface{}{
		"payment_status": string(paymentStatus),
		"updated_at":     time.Now(),
	}
	if paymentID != "" {
		updates["payment_id"] = paymentID
	}
	return r.db.WithContext(ctx).Model(&orderModel{}).
		Where("id = ?", id).
		Updates(updates).Error
}

// Helpers
func marshalItems(items []domain.OrderItem) ([]byte, error) {
	jsonItems := make([]orderItemJSON, len(items))
	for i, item := range items {
		jsonItems[i] = orderItemJSON{
			MenuID:   item.MenuID,
			MenuName: item.MenuName,
			Quantity: item.Quantity,
			Price:    item.Price,
			Subtotal: item.Subtotal,
		}
	}
	return json.Marshal(jsonItems)
}

func toOrderDomain(m orderModel) (*domain.Order, error) {
	var jsonItems []orderItemJSON
	if err := json.Unmarshal(m.Items, &jsonItems); err != nil {
		return nil, err
	}

	items := make([]domain.OrderItem, len(jsonItems))
	for i, item := range jsonItems {
		items[i] = domain.OrderItem{
			MenuID:   item.MenuID,
			MenuName: item.MenuName,
			Quantity: item.Quantity,
			Price:    item.Price,
			Subtotal: item.Subtotal,
		}
	}

	return &domain.Order{
		ID:             m.ID,
		UserID:         m.UserID,
		TableNumber:    m.TableNumber,
		Items:          items,
		Subtotal:       m.Subtotal,
		DiscountAmount: m.DiscountAmount,
		TaxAmount:      m.TaxAmount,
		ServiceCharge:  m.ServiceCharge,
		TotalAmount:    m.TotalAmount,
		Status:         domain.OrderStatus(m.Status),
		PaymentStatus:  domain.PaymentStatus(m.PaymentStatus),
		PaymentID:      m.PaymentID,
		QRISUrl:        m.QRISUrl,
		Notes:          m.Notes,
		CreatedAt:      m.CreatedAt,
		UpdatedAt:      m.UpdatedAt,
	}, nil
}
