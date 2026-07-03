package repository

import (
	"context"
	"errors"
	"time"

	"github.com/lib/pq"
	"github.com/nanda/nexus/core/domain"
	"gorm.io/gorm"
)

// menuModel DB struct — terpisah dari domain entity
type menuModel struct {
	ID          string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	Name        string         `gorm:"not null"`
	Description string
	Price       float64        `gorm:"not null"`
	Category    string         `gorm:"not null;default:'drink'"`
	Tags        pq.StringArray `gorm:"type:text[]"`
	ImageURL    string
	IsAvailable bool      `gorm:"default:true"`
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
		"name":         m.Name,
		"description":  m.Description,
		"price":        m.Price,
		"category":     string(m.Category),
		"tags":         pq.StringArray(m.Tags),
		"image_url":    m.ImageURL,
		"is_available": m.IsAvailable,
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
		Name:        m.Name,
		Description: m.Description,
		Price:       m.Price,
		Category:    string(m.Category),
		Tags:        pq.StringArray(m.Tags),
		ImageURL:    m.ImageURL,
		IsAvailable: m.IsAvailable,
	}
}

func toMenuDomain(m menuModel) *domain.Menu {
	return &domain.Menu{
		ID:          m.ID,
		Name:        m.Name,
		Description: m.Description,
		Price:       m.Price,
		Category:    domain.MenuCategory(m.Category),
		Tags:        []string(m.Tags),
		ImageURL:    m.ImageURL,
		IsAvailable: m.IsAvailable,
		CreatedAt:   m.CreatedAt,
		UpdatedAt:   m.UpdatedAt,
	}
}
