package repository

import (
	"context"
	"github.com/nanda/nexus/core/domain"
	"gorm.io/gorm"
)

// menuModel adalah representasi DB (GORM struct). Terpisah dari Entity murni.
type menuModel struct {
	ID          string  `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	Name        string  `gorm:"not null"`
	Description string
	Price       float64 `gorm:"not null"`
	IsAvailable bool    `gorm:"default:true"`
}

func (menuModel) TableName() string {
	return "menus"
}

type menuRepository struct {
	db *gorm.DB
}

func NewMenuRepository(db *gorm.DB) domain.MenuRepository {
	return &menuRepository{db: db}
}

func (r *menuRepository) Create(ctx context.Context, m *domain.Menu) error {
	// Mapping dari Domain Entity ke DB Model
	dbModel := &menuModel{
		Name:        m.Name,
		Description: m.Description,
		Price:       m.Price,
		IsAvailable: m.IsAvailable,
	}
	
	if err := r.db.WithContext(ctx).Create(dbModel).Error; err != nil {
		return err
	}
	
	// Update ID kembali ke domain
	m.ID = dbModel.ID
	return nil
}

func (r *menuRepository) GetByID(ctx context.Context, id string) (*domain.Menu, error) {
	var dbModel menuModel
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&dbModel).Error; err != nil {
		return nil, err
	}
	
	// Mapping dari DB Model ke Domain Entity
	return &domain.Menu{
		ID:          dbModel.ID,
		Name:        dbModel.Name,
		Description: dbModel.Description,
		Price:       dbModel.Price,
		IsAvailable: dbModel.IsAvailable,
	}, nil
}
