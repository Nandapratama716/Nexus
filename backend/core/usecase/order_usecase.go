package usecase

import (
	"context"
	"errors"

	"github.com/nanda/nexus/core/domain"
)

type orderUsecase struct {
	orderRepo domain.OrderRepository
	menuRepo  domain.MenuRepository
}

func NewOrderUsecase(orderRepo domain.OrderRepository, menuRepo domain.MenuRepository) domain.OrderUsecase {
	return &orderUsecase{orderRepo: orderRepo, menuRepo: menuRepo}
}

func (u *orderUsecase) CreateOrder(ctx context.Context, order *domain.Order) error {
	if len(order.Items) == 0 {
		return errors.New("pesanan harus memiliki minimal 1 item")
	}
	if order.UserID == "" {
		return errors.New("user ID wajib ada")
	}

	// Hitung total dan snapshot harga dari menu terkini
	var total float64
	for i, item := range order.Items {
		menu, err := u.menuRepo.GetByID(ctx, item.MenuID)
		if err != nil {
			return errors.New("menu ID " + item.MenuID + " tidak ditemukan")
		}
		if !menu.IsAvailable {
			return errors.New("menu " + menu.Name + " sedang tidak tersedia")
		}

		// Snapshot harga saat order dibuat (immutable)
		order.Items[i].MenuName = menu.Name
		order.Items[i].Price = menu.Price
		order.Items[i].Subtotal = menu.Price * float64(item.Quantity)
		total += order.Items[i].Subtotal
	}

	order.TotalAmount = total
	order.Status = domain.StatusPending
	order.PaymentStatus = domain.PaymentPending

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

func (u *orderUsecase) HandlePaymentWebhook(ctx context.Context, paymentID string, status domain.PaymentStatus) error {
	// Implementasi idempotency: cek status sebelum update
	// (dalam implementasi lengkap, cari order berdasarkan paymentID)
	return nil // placeholder — akan diimplementasi di poin Midtrans
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
