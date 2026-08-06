package usecase_test

import (
	"context"
	"errors"
	"testing"

	"github.com/nanda/nexus/core/domain"
	"github.com/nanda/nexus/core/usecase"
)

// mockTenantOrderRepo memodelkan isolasi tenant berbasis GORM Scopes & RLS
type mockTenantOrderRepo struct {
	orders []*domain.Order
}

func (m *mockTenantOrderRepo) Create(ctx context.Context, o *domain.Order) error {
	m.orders = append(m.orders, o)
	return nil
}

func (m *mockTenantOrderRepo) GetByID(ctx context.Context, id string) (*domain.Order, error) {
	tenantID, _ := ctx.Value("tenant_id").(string)
	for _, o := range m.orders {
		if o.ID == id {
			if tenantID != "" && o.TenantID != tenantID {
				return nil, errors.New("order tidak ditemukan") // Terisolasi
			}
			return o, nil
		}
	}
	return nil, errors.New("order tidak ditemukan")
}

func (m *mockTenantOrderRepo) GetByUserID(ctx context.Context, userID string) ([]domain.Order, error) {
	tenantID, _ := ctx.Value("tenant_id").(string)
	var result []domain.Order
	for _, o := range m.orders {
		if o.UserID == userID {
			if tenantID == "" || o.TenantID == tenantID {
				result = append(result, *o)
			}
		}
	}
	return result, nil
}

func (m *mockTenantOrderRepo) GetAllActive(ctx context.Context) ([]domain.Order, error) {
	tenantID, _ := ctx.Value("tenant_id").(string)
	var result []domain.Order
	for _, o := range m.orders {
		if tenantID == "" || o.TenantID == tenantID {
			result = append(result, *o)
		}
	}
	return result, nil
}

func (m *mockTenantOrderRepo) UpdateStatus(ctx context.Context, id string, status domain.OrderStatus) error {
	tenantID, _ := ctx.Value("tenant_id").(string)
	for _, o := range m.orders {
		if o.ID == id {
			if tenantID != "" && o.TenantID != tenantID {
				return errors.New("akses ditolak: data milik tenant lain")
			}
			o.Status = status
			return nil
		}
	}
	return errors.New("order tidak ditemukan")
}

func (m *mockTenantOrderRepo) UpdatePaymentStatus(ctx context.Context, id string, paymentStatus domain.PaymentStatus, paymentID string) error {
	return nil
}

// Uji Otomatis Eksplisit: Isolasi Data Lintas Tenant
func TestTenantIsolation_Orders(t *testing.T) {
	repo := &mockTenantOrderRepo{}
	menuRepo := newMockMenuRepoForOrder(map[string]*domain.Menu{
		"m1": {ID: "m1", Name: "Kopi Susu", Price: 20000, IsAvailable: true, StockQty: 100},
	})

	uc := usecase.NewOrderUsecase(repo, menuRepo)

	ctxTenantA := context.WithValue(context.Background(), "tenant_id", "tenant-alpha")
	ctxTenantB := context.WithValue(context.Background(), "tenant_id", "tenant-beta")

	// 1. Tenant A membuat order
	orderA := &domain.Order{
		ID:          "order-alpha-100",
		TenantID:    "tenant-alpha",
		StoreID:     "store-01",
		UserID:      "user-1",
		TableNumber: "1",
		OrderType:   domain.OrderDineIn,
		Items:       []domain.OrderItem{{MenuID: "m1", Quantity: 1}},
	}
	err := uc.CreateOrder(ctxTenantA, orderA)
	if err != nil {
		t.Fatalf("Gagal membuat order Tenant A: %v", err)
	}

	// 2. Tenant B mencoba mengakses order milik Tenant A -> Harus gagal (Order Not Found)
	_, errB := uc.GetOrder(ctxTenantB, "order-alpha-100")
	if errB == nil {
		t.Errorf("KEBOCORAN DATA DETEKSI: Tenant B berhasil mengakses order milik Tenant A!")
	}

	// 3. Tenant B query list active orders -> Harus kosong (0 items)
	activeB, _ := uc.GetActiveOrders(ctxTenantB)
	if len(activeB) != 0 {
		t.Errorf("KEBOCORAN DATA DETEKSI: Tenant B melihat %d order aktif milik Tenant A!", len(activeB))
	}

	// 4. Tenant A query list active orders -> Harus menemukan 1 order miliknya
	activeA, _ := uc.GetActiveOrders(ctxTenantA)
	if len(activeA) != 1 {
		t.Errorf("Tenant A gagal melihat order miliknya. Ekspektasi: 1, Ditemukan: %d", len(activeA))
	}
}
