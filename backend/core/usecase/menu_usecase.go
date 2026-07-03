package usecase

import (
	"context"
	"errors"
	"github.com/nanda/nexus/core/domain"
)

type menuUsecase struct {
	menuRepo domain.MenuRepository
}

func NewMenuUsecase(repo domain.MenuRepository) domain.MenuUsecase {
	return &menuUsecase{
		menuRepo: repo,
	}
}

func (u *menuUsecase) CreateMenu(ctx context.Context, menu *domain.Menu) error {
	if menu.Name == "" || menu.Price <= 0 {
		return errors.New("nama dan harga valid wajib diisi")
	}
	
	menu.IsAvailable = true // default logika bisnis
	
	// Panggil repository (publish event ke Redis Streams bisa ditambahkan di sini nantinya)
	return u.menuRepo.Create(ctx, menu)
}

func (u *menuUsecase) GetMenu(ctx context.Context, id string) (*domain.Menu, error) {
	if id == "" {
		return nil, errors.New("ID tidak valid")
	}
	return u.menuRepo.GetByID(ctx, id)
}
