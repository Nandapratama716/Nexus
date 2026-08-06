package repository

import (
	"database/sql/driver"
	"encoding/json"
	"context"
	"errors"
	"strings"
	"time"

	"github.com/lib/pq"
	"github.com/nanda/nexus/core/domain"
	"gorm.io/gorm"
)

// StringTags tipe custom scanner/valuer agar fleksibel membaca format JSON string ["a","b"] maupun Postgres array {"a","b"}
type StringTags []string

func (t *StringTags) Scan(value interface{}) error {
	if value == nil {
		*t = []string{}
		return nil
	}

	var strVal string
	switch v := value.(type) {
	case string:
		strVal = v
	case []byte:
		strVal = string(v)
	default:
		*t = []string{}
		return nil
	}

	strVal = strings.TrimSpace(strVal)
	if strVal == "" {
		*t = []string{}
		return nil
	}

	// 1. Coba parse JSON Array: ["pedas", "populer"]
	if strings.HasPrefix(strVal, "[") {
		var tags []string
		if err := json.Unmarshal([]byte(strVal), &tags); err == nil {
			*t = tags
			return nil
		}
	}

	// 2. Coba parse Postgres Native Array: {"pedas", "populer"}
	var pqArray pq.StringArray
	if err := pqArray.Scan(value); err == nil {
		*t = []string(pqArray)
		return nil
	}

	// 3. Fallback string tunggal
	*t = []string{strVal}
	return nil
}

func (t StringTags) Value() (driver.Value, error) {
	if len(t) == 0 {
		return "[]", nil
	}
	bytes, err := json.Marshal(t)
	if err != nil {
		return "[]", nil
	}
	return string(bytes), nil
}

// menuModel DB struct — terpisah dari domain entity
type menuModel struct {
	ID          string     `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	TenantID    string     `gorm:"type:varchar(255);index"`
	StoreID     string     `gorm:"type:varchar(255);index"`
	Name        string     `gorm:"not null"`
	Description string
	Price       float64    `gorm:"not null"`
	Category    string     `gorm:"not null;default:'drink'"`
	Tags        StringTags `gorm:"type:text"`
	ImageURL    string
	IsAvailable bool       `gorm:"default:true"`
	StockQty    int        `gorm:"default:25"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func (menuModel) TableName() string { return "menus" }

type menuRepository struct {
	db *gorm.DB
}

func NewMenuRepository(db *gorm.DB) domain.MenuRepository {
	return &menuRepository{db: db}
}

func (r *menuRepository) Create(ctx context.Context, m *domain.Menu) error {
	model := toMenuModel(m)
	if err := r.db.WithContext(ctx).Create(model).Error; err != nil {
		return err
	}
	m.ID = model.ID
	m.CreatedAt = model.CreatedAt
	m.UpdatedAt = model.UpdatedAt
	return nil
}

func (r *menuRepository) GetByID(ctx context.Context, id string) (*domain.Menu, error) {
	var model menuModel
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&model).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("menu tidak ditemukan")
		}
		return nil, err
	}
	return toMenuDomain(model), nil
}

func (r *menuRepository) GetAll(ctx context.Context) ([]domain.Menu, error) {
	var models []menuModel
	if err := r.db.WithContext(ctx).Find(&models).Error; err != nil {
		return nil, err
	}
	menus := make([]domain.Menu, len(models))
	for i, m := range models {
		menus[i] = *toMenuDomain(m)
	}
	return menus, nil
}

func (r *menuRepository) Update(ctx context.Context, m *domain.Menu) error {
	updates := map[string]interface{}{
		"tenant_id":    m.TenantID,
		"store_id":     m.StoreID,
		"name":         m.Name,
		"description":  m.Description,
		"price":        m.Price,
		"category":     string(m.Category),
		"tags":         StringTags(m.Tags),
		"image_url":    m.ImageURL,
		"is_available": m.IsAvailable,
		"stock_qty":    m.StockQty,
	}
	return r.db.WithContext(ctx).Model(&menuModel{}).
		Where("id = ?", m.ID).Updates(updates).Error
}

func (r *menuRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&menuModel{}).Error
}

// Mapping helpers
func toMenuModel(m *domain.Menu) *menuModel {
	return &menuModel{
		ID:          m.ID,
		TenantID:    m.TenantID,
		StoreID:     m.StoreID,
		Name:        m.Name,
		Description: m.Description,
		Price:       m.Price,
		Category:    string(m.Category),
		Tags:        StringTags(m.Tags),
		ImageURL:    m.ImageURL,
		IsAvailable: m.IsAvailable,
		StockQty:    m.StockQty,
	}
}

func toMenuDomain(m menuModel) *domain.Menu {
	return &domain.Menu{
		ID:          m.ID,
		TenantID:    m.TenantID,
		StoreID:     m.StoreID,
		Name:        m.Name,
		Description: m.Description,
		Price:       m.Price,
		Category:    domain.MenuCategory(m.Category),
		Tags:        []string(m.Tags),
		ImageURL:    m.ImageURL,
		IsAvailable: m.IsAvailable,
		StockQty:    m.StockQty,
		CreatedAt:   m.CreatedAt,
		UpdatedAt:   m.UpdatedAt,
	}
}
