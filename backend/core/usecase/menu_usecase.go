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
	return &menuUsecase{menuRepo: repo}
}

func (u *menuUsecase) CreateMenu(ctx context.Context, menu *domain.Menu) error {
	if menu.Name == "" {
		return errors.New("nama menu wajib diisi")
	}
	if menu.Price <= 0 {
		return errors.New("harga harus lebih dari 0")
	}
	menu.IsAvailable = true
	return u.menuRepo.Create(ctx, menu)
}

func (u *menuUsecase) GetMenu(ctx context.Context, id string) (*domain.Menu, error) {
	if id == "" {
		return nil, errors.New("ID tidak valid")
	}
	return u.menuRepo.GetByID(ctx, id)
}

func (u *menuUsecase) GetAllMenus(ctx context.Context) ([]domain.Menu, error) {
	return u.menuRepo.GetAll(ctx)
}

func (u *menuUsecase) UpdateMenu(ctx context.Context, menu *domain.Menu) error {
	if menu.ID == "" {
		return errors.New("ID menu wajib ada untuk update")
	}
	if menu.Price < 0 {
		return errors.New("harga tidak boleh negatif")
	}
	return u.menuRepo.Update(ctx, menu)
}

func (u *menuUsecase) DeleteMenu(ctx context.Context, id string) error {
	if id == "" {
		return errors.New("ID tidak valid")
	}
	return u.menuRepo.Delete(ctx, id)
}
