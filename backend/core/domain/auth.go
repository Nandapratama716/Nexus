package domain

import (
	"context"
	"time"
)

// Role tipe user
type Role string

const (
	RoleCustomer Role = "customer"
	RoleAdmin    Role = "admin"
	RoleStaff    Role = "staff"
)

// User entity murni — tidak ada tag GORM
type User struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Role         Role      `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
}

// AuthRepository interface injeksi ke usecase
type AuthRepository interface {
	Create(ctx context.Context, user *User) error
	FindByEmail(ctx context.Context, email string) (*User, error)
	FindByID(ctx context.Context, id string) (*User, error)
}

// AuthUsecase interface injeksi ke delivery
type AuthUsecase interface {
	Register(ctx context.Context, name, email, password string) (*User, error)
	Login(ctx context.Context, email, password string) (token string, err error)
}
