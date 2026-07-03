package repository

import (
	"context"
	"encoding/json"
	"errors"
	"time"

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
	ID            string `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID        string `gorm:"not null;type:uuid"`
	TableNumber   string
	Items         []byte        `gorm:"type:jsonb;not null"`
	TotalAmount   float64       `gorm:"not null"`
	Status        string        `gorm:"not null;default:'pending'"`
	PaymentStatus string        `gorm:"not null;default:'pending'"`
	PaymentID     string
	QRISUrl       string
	Notes         string
	CreatedAt     time.Time
	UpdatedAt     time.Time
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
	model := &orderModel{
		UserID:        o.UserID,
		TableNumber:   o.TableNumber,
		Items:         itemsJSON,
		TotalAmount:   o.TotalAmount,
		Status:        string(o.Status),
		PaymentStatus: string(o.PaymentStatus),
		Notes:         o.Notes,
	}
	if err := r.db.WithContext(ctx).Create(model).Error; err != nil {
		return err
	}
	o.ID = model.ID
	o.CreatedAt = model.CreatedAt
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
	if err := r.db.WithContext(ctx).Where("user_id = ?", userID).
		Order("created_at DESC").Find(&models).Error; err != nil {
		return nil, err
	}
	return toOrderDomainList(models)
}

func (r *orderRepository) GetAllActive(ctx context.Context) ([]domain.Order, error) {
	var models []orderModel
	// KDS: tampilkan pending dan preparing
	if err := r.db.WithContext(ctx).
		Where("status IN ?", []string{"pending", "preparing"}).
		Order("created_at ASC").Find(&models).Error; err != nil {
		return nil, err
	}
	return toOrderDomainList(models)
}

func (r *orderRepository) UpdateStatus(ctx context.Context, id string, status domain.OrderStatus) error {
	return r.db.WithContext(ctx).Model(&orderModel{}).
		Where("id = ?", id).Update("status", string(status)).Error
}

func (r *orderRepository) UpdatePaymentStatus(ctx context.Context, id string, paymentStatus domain.PaymentStatus, paymentID string) error {
	return r.db.WithContext(ctx).Model(&orderModel{}).
		Where("id = ?", id).Updates(map[string]interface{}{
		"payment_status": string(paymentStatus),
		"payment_id":     paymentID,
	}).Error
}

// Helpers
func marshalItems(items []domain.OrderItem) ([]byte, error) {
	list := make([]orderItemJSON, len(items))
	for i, item := range items {
		list[i] = orderItemJSON{
			MenuID:   item.MenuID,
			MenuName: item.MenuName,
			Quantity: item.Quantity,
			Price:    item.Price,
			Subtotal: item.Subtotal,
		}
	}
	return json.Marshal(list)
}

func toOrderDomain(m orderModel) (*domain.Order, error) {
	var itemsJSON []orderItemJSON
	if err := json.Unmarshal(m.Items, &itemsJSON); err != nil {
		return nil, err
	}
	items := make([]domain.OrderItem, len(itemsJSON))
	for i, item := range itemsJSON {
		items[i] = domain.OrderItem{
			MenuID:   item.MenuID,
			MenuName: item.MenuName,
			Quantity: item.Quantity,
			Price:    item.Price,
			Subtotal: item.Subtotal,
		}
	}
	return &domain.Order{
		ID:            m.ID,
		UserID:        m.UserID,
		TableNumber:   m.TableNumber,
		Items:         items,
		TotalAmount:   m.TotalAmount,
		Status:        domain.OrderStatus(m.Status),
		PaymentStatus: domain.PaymentStatus(m.PaymentStatus),
		PaymentID:     m.PaymentID,
		QRISUrl:       m.QRISUrl,
		Notes:         m.Notes,
		CreatedAt:     m.CreatedAt,
		UpdatedAt:     m.UpdatedAt,
	}, nil
}

func toOrderDomainList(models []orderModel) ([]domain.Order, error) {
	orders := make([]domain.Order, 0, len(models))
	for _, m := range models {
		o, err := toOrderDomain(m)
		if err != nil {
			return nil, err
		}
		orders = append(orders, *o)
	}
	return orders, nil
}
