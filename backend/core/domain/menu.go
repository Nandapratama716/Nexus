package domain

import (
	"context"
	"time"
)

// MenuCategory kategori menu
type MenuCategory string

const (
	CategoryDrink MenuCategory = "drink"
	CategoryFood  MenuCategory = "food"
	CategorySnack MenuCategory = "snack"
)

// Menu entity murni
type Menu struct {
	ID          string       `json:"id"`
	Name        string       `json:"name"`
	Description string       `json:"description"`
	Price       float64      `json:"price"`
	Category    MenuCategory `json:"category"`
	Tags        []string     `json:"tags" gorm:"serializer:json"` // e.g. ["manis", "dingin", "populer"]
	ImageURL    string       `json:"image_url"`
	IsAvailable bool         `json:"is_available"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}

// MenuRepository interface injeksi ke usecase
type MenuRepository interface {
	Create(ctx context.Context, menu *Menu) error
	GetByID(ctx context.Context, id string) (*Menu, error)
	GetAll(ctx context.Context) ([]Menu, error)
	Update(ctx context.Context, menu *Menu) error
	Delete(ctx context.Context, id string) error
}

// MenuUsecase interface injeksi ke delivery
type MenuUsecase interface {
	CreateMenu(ctx context.Context, menu *Menu) error
	GetMenu(ctx context.Context, id string) (*Menu, error)
	GetAllMenus(ctx context.Context) ([]Menu, error)
	UpdateMenu(ctx context.Context, menu *Menu) error
	DeleteMenu(ctx context.Context, id string) error
}
