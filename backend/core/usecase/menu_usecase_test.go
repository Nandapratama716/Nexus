package usecase_test

import (
	"context"
	"errors"
	"testing"

	"github.com/nanda/nexus/core/domain"
	"github.com/nanda/nexus/core/usecase"
)

// --- Mock Repository ---

type mockMenuRepo struct {
	menus  map[string]*domain.Menu
	errOn  string
}

func newMockMenuRepo() *mockMenuRepo {
	return &mockMenuRepo{menus: make(map[string]*domain.Menu)}
}

func (m *mockMenuRepo) Create(ctx context.Context, menu *domain.Menu) error {
	if m.errOn == "create" {
		return errors.New("db error")
	}
	menu.ID = "menu-uuid-1"
	m.menus[menu.ID] = menu
	return nil
}

func (m *mockMenuRepo) GetByID(ctx context.Context, id string) (*domain.Menu, error) {
	if menu, ok := m.menus[id]; ok {
		return menu, nil
	}
	return nil, errors.New("menu tidak ditemukan")
}

func (m *mockMenuRepo) GetAll(ctx context.Context) ([]domain.Menu, error) { return nil, nil }
func (m *mockMenuRepo) Update(ctx context.Context, menu *domain.Menu) error { return nil }
func (m *mockMenuRepo) Delete(ctx context.Context, id string) error { return nil }

// --- Table-Driven Tests: MenuUsecase ---

func TestMenuUsecase_CreateMenu(t *testing.T) {
	tests := []struct {
		name    string
		input   *domain.Menu
		wantErr bool
		errMsg  string
	}{
		{
			name:    "sukses buat menu valid",
			input:   &domain.Menu{Name: "Kopi Susu", Price: 25000},
			wantErr: false,
		},
		{
			name:    "gagal — nama kosong",
			input:   &domain.Menu{Name: "", Price: 25000},
			wantErr: true,
			errMsg:  "nama menu wajib diisi",
		},
		{
			name:    "gagal — harga nol",
			input:   &domain.Menu{Name: "Kopi", Price: 0},
			wantErr: true,
			errMsg:  "harga harus lebih dari 0",
		},
		{
			name:    "gagal — harga negatif",
			input:   &domain.Menu{Name: "Kopi", Price: -5000},
			wantErr: true,
			errMsg:  "harga harus lebih dari 0",
		},
	}

	repo := newMockMenuRepo()
	uc := usecase.NewMenuUsecase(repo)

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := uc.CreateMenu(context.Background(), tc.input)
			if (err != nil) != tc.wantErr {
				t.Errorf("CreateMenu() error = %v, wantErr = %v", err, tc.wantErr)
			}
			if tc.wantErr && err != nil && err.Error() != tc.errMsg {
				t.Errorf("CreateMenu() errMsg = %q, want %q", err.Error(), tc.errMsg)
			}
			if !tc.wantErr && tc.input.IsAvailable != true {
				t.Error("IsAvailable harus true setelah CreateMenu")
			}
		})
	}
}
