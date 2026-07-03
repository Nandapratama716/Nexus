package repository

import (
	"context"
	"errors"

	"github.com/nanda/nexus/core/domain"
	"gorm.io/gorm"
)

// userModel DB struct — terpisah dari domain entity
type userModel struct {
	ID           string `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	Name         string `gorm:"not null"`
	Email        string `gorm:"uniqueIndex;not null"`
	PasswordHash string `gorm:"not null"`
	Role         string `gorm:"not null;default:'customer'"`
}

func (userModel) TableName() string { return "users" }

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) domain.AuthRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(ctx context.Context, u *domain.User) error {
	model := &userModel{
		Name:         u.Name,
		Email:        u.Email,
		PasswordHash: u.PasswordHash,
		Role:         string(u.Role),
	}
	if err := r.db.WithContext(ctx).Create(model).Error; err != nil {
		return err
	}
	u.ID = model.ID
	return nil
}

func (r *userRepository) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	var model userModel
	if err := r.db.WithContext(ctx).Where("email = ?", email).First(&model).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user tidak ditemukan")
		}
		return nil, err
	}
	return toDomainUser(model), nil
}

func (r *userRepository) FindByID(ctx context.Context, id string) (*domain.User, error) {
	var model userModel
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&model).Error; err != nil {
		return nil, errors.New("user tidak ditemukan")
	}
	return toDomainUser(model), nil
}

func toDomainUser(m userModel) *domain.User {
	return &domain.User{
		ID:           m.ID,
		Name:         m.Name,
		Email:        m.Email,
		PasswordHash: m.PasswordHash,
		Role:         domain.Role(m.Role),
	}
}
