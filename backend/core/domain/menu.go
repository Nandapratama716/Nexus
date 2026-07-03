package domain

import "context"

// Menu adalah entity murni, tidak ada tag ORM.
type Menu struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	IsAvailable bool    `json:"is_available"`
}

// MenuRepository interface untuk injeksi ke usecase.
type MenuRepository interface {
	Create(ctx context.Context, menu *Menu) error
	GetByID(ctx context.Context, id string) (*Menu, error)
}

// MenuUsecase interface bisnis logika untuk injeksi ke delivery.
type MenuUsecase interface {
	CreateMenu(ctx context.Context, menu *Menu) error
	GetMenu(ctx context.Context, id string) (*Menu, error)
}
