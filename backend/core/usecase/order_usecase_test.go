package usecase_test

import (
	"context"
	"errors"
	"testing"

	"github.com/nanda/nexus/core/domain"
	"github.com/nanda/nexus/core/usecase"
)

// --- Mock Repositories untuk Order ---

type mockOrderRepo struct {
	orders map[string]*domain.Order
}

func newMockOrderRepo() *mockOrderRepo {
	return &mockOrderRepo{orders: make(map[string]*domain.Order)}
}

func (m *mockOrderRepo) Create(ctx context.Context, o *domain.Order) error {
	o.ID = "order-uuid-1"
	m.orders[o.ID] = o
	return nil
}

func (m *mockOrderRepo) GetByID(ctx context.Context, id string) (*domain.Order, error) {
	if o, ok := m.orders[id]; ok {
		return o, nil
	}
	return nil, errors.New("order tidak ditemukan")
}

func (m *mockOrderRepo) GetByUserID(ctx context.Context, userID string) ([]domain.Order, error) {
	return nil, nil
}

func (m *mockOrderRepo) GetAllActive(ctx context.Context) ([]domain.Order, error) { return nil, nil }

func (m *mockOrderRepo) UpdateStatus(ctx context.Context, id string, status domain.OrderStatus) error {
	if o, ok := m.orders[id]; ok {
		o.Status = status
		return nil
	}
	return errors.New("order tidak ditemukan")
}

func (m *mockOrderRepo) UpdatePaymentStatus(ctx context.Context, id string, paymentStatus domain.PaymentStatus, paymentID string) error {
	return nil
}

type mockMenuRepoForOrder struct {
	menus map[string]*domain.Menu
}

func newMockMenuRepoForOrder(menus map[string]*domain.Menu) *mockMenuRepoForOrder {
	return &mockMenuRepoForOrder{menus: menus}
}

func (m *mockMenuRepoForOrder) Create(ctx context.Context, menu *domain.Menu) error { return nil }
func (m *mockMenuRepoForOrder) GetAll(ctx context.Context) ([]domain.Menu, error) { return nil, nil }
func (m *mockMenuRepoForOrder) Update(ctx context.Context, menu *domain.Menu) error { return nil }
func (m *mockMenuRepoForOrder) Delete(ctx context.Context, id string) error { return nil }
func (m *mockMenuRepoForOrder) GetByID(ctx context.Context, id string) (*domain.Menu, error) {
	if menu, ok := m.menus[id]; ok {
		return menu, nil
	}
	return nil, errors.New("menu tidak ditemukan")
}

// --- Table-Driven Tests: OrderUsecase ---

func TestOrderUsecase_CreateOrder(t *testing.T) {
	availableMenus := map[string]*domain.Menu{
		"menu-1": {ID: "menu-1", Name: "Kopi Susu", Price: 25000, IsAvailable: true},
	}
	unavailableMenus := map[string]*domain.Menu{
		"menu-1": {ID: "menu-1", Name: "Kopi Susu", Price: 25000, IsAvailable: false},
	}

	tests := []struct {
		name      string
		order     *domain.Order
		menuStore map[string]*domain.Menu
		wantErr   bool
		wantTotal float64
	}{
		{
			name: "sukses — total dihitung benar",
			order: &domain.Order{
				UserID: "user-1",
				Items:  []domain.OrderItem{{MenuID: "menu-1", Quantity: 2}},
			},
			menuStore: availableMenus,
			wantErr:   false,
			wantTotal: 50000,
		},
		{
			name:      "gagal — tidak ada item",
			order:     &domain.Order{UserID: "user-1", Items: []domain.OrderItem{}},
			menuStore: availableMenus,
			wantErr:   true,
		},
		{
			name: "gagal — menu tidak tersedia",
			order: &domain.Order{
				UserID: "user-1",
				Items:  []domain.OrderItem{{MenuID: "menu-1", Quantity: 1}},
			},
			menuStore: unavailableMenus,
			wantErr:   true,
		},
		{
			name: "gagal — menu tidak ditemukan",
			order: &domain.Order{
				UserID: "user-1",
				Items:  []domain.OrderItem{{MenuID: "menu-INVALID", Quantity: 1}},
			},
			menuStore: availableMenus,
			wantErr:   true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			uc := usecase.NewOrderUsecase(newMockOrderRepo(), newMockMenuRepoForOrder(tc.menuStore))
			err := uc.CreateOrder(context.Background(), tc.order)
			if (err != nil) != tc.wantErr {
				t.Errorf("CreateOrder() error = %v, wantErr = %v", err, tc.wantErr)
			}
			if !tc.wantErr && tc.order.TotalAmount != tc.wantTotal {
				t.Errorf("TotalAmount = %.0f, want %.0f", tc.order.TotalAmount, tc.wantTotal)
			}
		})
	}
}

func TestOrderUsecase_UpdateStatus_StateMachine(t *testing.T) {
	tests := []struct {
		name       string
		from       domain.OrderStatus
		to         domain.OrderStatus
		wantErr    bool
	}{
		{"valid: pending -> preparing", domain.StatusPending, domain.StatusPreparing, false},
		{"valid: preparing -> ready", domain.StatusPreparing, domain.StatusReady, false},
		{"valid: ready -> done", domain.StatusReady, domain.StatusDone, false},
		{"valid: pending -> cancelled", domain.StatusPending, domain.StatusCancelled, false},
		{"invalid: pending -> done", domain.StatusPending, domain.StatusDone, true},
		{"invalid: done -> preparing", domain.StatusDone, domain.StatusPreparing, true},
		{"invalid: cancelled -> preparing", domain.StatusCancelled, domain.StatusPreparing, true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := newMockOrderRepo()
			menuRepo := newMockMenuRepoForOrder(map[string]*domain.Menu{
				"menu-1": {ID: "menu-1", Name: "Kopi", Price: 15000, IsAvailable: true},
			})
			uc := usecase.NewOrderUsecase(repo, menuRepo)

			// Setup: buat order dengan status awal
			order := &domain.Order{
				UserID: "user-1",
				Items:  []domain.OrderItem{{MenuID: "menu-1", Quantity: 1}},
			}
			_ = uc.CreateOrder(context.Background(), order)
			repo.orders["order-uuid-1"].Status = tc.from

			err := uc.UpdateOrderStatus(context.Background(), "order-uuid-1", tc.to)
			if (err != nil) != tc.wantErr {
				t.Errorf("UpdateOrderStatus() error = %v, wantErr = %v", err, tc.wantErr)
			}
		})
	}
}
