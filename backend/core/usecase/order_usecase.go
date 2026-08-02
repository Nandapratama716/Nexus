package usecase

import (
	"context"
	"errors"
	"fmt"
	"math"

	"github.com/nanda/nexus/core/domain"
)

type MenuPublisher interface {
	Publish(ctx context.Context, action, menuID string, payload interface{})
}

type orderUsecase struct {
	orderRepo domain.OrderRepository
	menuRepo  domain.MenuRepository
	publisher MenuPublisher
}

func NewOrderUsecase(orderRepo domain.OrderRepository, menuRepo domain.MenuRepository, publisher ...MenuPublisher) domain.OrderUsecase {
	var pub MenuPublisher
	if len(publisher) > 0 {
		pub = publisher[0]
	}
	return &orderUsecase{orderRepo: orderRepo, menuRepo: menuRepo, publisher: pub}
}

func (u *orderUsecase) CreateOrder(ctx context.Context, order *domain.Order) error {
	if len(order.Items) == 0 {
		return errors.New("pesanan harus memiliki minimal 1 item")
	}
	if order.UserID == "" {
		return errors.New("user ID wajib ada")
	}

	// Default order type
	if order.OrderType == "" {
		order.OrderType = domain.OrderDineIn
	}

	// Default payment method
	if order.PaymentMethod == "" {
		order.PaymentMethod = domain.PaymentQRIS
	}

	// Hitung total, validasi stok, dan snapshot harga dari menu terkini
	var total float64
	menusToUpdate := make([]*domain.Menu, 0, len(order.Items))

	for i, item := range order.Items {
		menu, err := u.menuRepo.GetByID(ctx, item.MenuID)
		if err != nil {
			return errors.New("menu ID " + item.MenuID + " tidak ditemukan")
		}
		if !menu.IsAvailable {
			return errors.New("menu " + menu.Name + " sedang tidak tersedia")
		}

		// Validasi stok kuantitas jika stok diatur (> 0)
		if menu.StockQty > 0 && menu.StockQty < item.Quantity {
			return fmt.Errorf("stok menu %s tidak mencukupi (sisa %d)", menu.Name, menu.StockQty)
		}

		// Update stok & status ketersediaan jika stok diatur (> 0)
		if menu.StockQty > 0 {
			menu.StockQty -= item.Quantity
			if menu.StockQty <= 0 {
				menu.StockQty = 0
				menu.IsAvailable = false // Auto-sold out trigger
			}
			menusToUpdate = append(menusToUpdate, menu)
		}

		// Snapshot harga saat order dibuat (immutable)
		order.Items[i].MenuName = menu.Name
		order.Items[i].Price = menu.Price
		order.Items[i].Subtotal = menu.Price * float64(item.Quantity)
		total += order.Items[i].Subtotal
	}

	// Simpan perubahan stok & publish event sync ke Redis Stream
	for _, menu := range menusToUpdate {
		_ = u.menuRepo.Update(ctx, menu)
		if u.publisher != nil {
			u.publisher.Publish(ctx, "update", menu.ID, menu)
		}
	}

	order.TotalAmount = math.Round(total*100) / 100
	order.Status = domain.StatusPending

	// --- Cash Payment: langsung settled ---
	if order.PaymentMethod == domain.PaymentCash {
		if order.CashPaid < order.TotalAmount {
			return errors.New("uang tidak cukup: bayar Rp " +
				formatCurrency(order.CashPaid) + ", total Rp " +
				formatCurrency(order.TotalAmount))
		}
		order.CashChange = math.Round((order.CashPaid-order.TotalAmount)*100) / 100
		order.PaymentStatus = domain.PaymentSettled
	} else {
		// QRIS: tunggu webhook callback
		order.PaymentStatus = domain.PaymentPending
	}

	return u.orderRepo.Create(ctx, order)
}

func (u *orderUsecase) GetOrder(ctx context.Context, id string) (*domain.Order, error) {
	return u.orderRepo.GetByID(ctx, id)
}

func (u *orderUsecase) GetUserOrders(ctx context.Context, userID string) ([]domain.Order, error) {
	return u.orderRepo.GetByUserID(ctx, userID)
}

func (u *orderUsecase) GetActiveOrders(ctx context.Context) ([]domain.Order, error) {
	return u.orderRepo.GetAllActive(ctx)
}

func (u *orderUsecase) UpdateOrderStatus(ctx context.Context, id string, status domain.OrderStatus) error {
	if id == "" {
		return errors.New("ID tidak valid")
	}
	// Validasi transisi status: pending -> preparing -> ready -> done
	order, err := u.orderRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if !isValidTransition(order.Status, status) {
		return errors.New("transisi status tidak valid: " + string(order.Status) + " -> " + string(status))
	}
	return u.orderRepo.UpdateStatus(ctx, id, status)
}

func (u *orderUsecase) HandlePaymentWebhook(ctx context.Context, orderID string, status domain.PaymentStatus) error {
	order, err := u.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return errors.New("order tidak ditemukan")
	}

	// Idempotency: jangan update jika status sudah settled/berhasil
	if order.PaymentStatus == domain.PaymentSettled {
		return nil
	}

	// Update payment status (kosongkan paymentID baru karena pakai ID yang lama/mock)
	return u.orderRepo.UpdatePaymentStatus(ctx, orderID, status, order.PaymentID)
}

// isValidTransition validasi state machine transisi status
func isValidTransition(current, next domain.OrderStatus) bool {
	allowed := map[domain.OrderStatus][]domain.OrderStatus{
		domain.StatusPending:   {domain.StatusPreparing, domain.StatusCancelled},
		domain.StatusPreparing: {domain.StatusReady, domain.StatusCancelled},
		domain.StatusReady:     {domain.StatusDone},
		domain.StatusDone:      {},
		domain.StatusCancelled: {},
	}
	for _, s := range allowed[current] {
		if s == next {
			return true
		}
	}
	return false
}

// formatCurrency format angka ke string sederhana
func formatCurrency(amount float64) string {
	if amount == float64(int64(amount)) {
		return fmt.Sprintf("%.0f", amount)
	}
	return fmt.Sprintf("%.2f", amount)
}
