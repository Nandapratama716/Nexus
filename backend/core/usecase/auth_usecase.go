package usecase

import (
	"context"
	"errors"

	"github.com/nanda/nexus/core/domain"
	"github.com/nanda/nexus/core/infrastructure"
	"golang.org/x/crypto/bcrypt"
)

type authUsecase struct {
	authRepo domain.AuthRepository
}

func NewAuthUsecase(repo domain.AuthRepository) domain.AuthUsecase {
	return &authUsecase{authRepo: repo}
}

func (u *authUsecase) Register(ctx context.Context, name, email, password string) (*domain.User, error) {
	if name == "" || email == "" || password == "" {
		return nil, errors.New("nama, email, dan password wajib diisi")
	}
	if len(password) < 8 {
		return nil, errors.New("password minimal 8 karakter")
	}

	// Hash password sebelum simpan
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("gagal memproses password")
	}

	user := &domain.User{
		Name:         name,
		Email:        email,
		PasswordHash: string(hash),
		Role:         domain.RoleCustomer, // default role
	}

	if err := u.authRepo.Create(ctx, user); err != nil {
		return nil, errors.New("email sudah terdaftar")
	}

	return user, nil
}

func (u *authUsecase) Login(ctx context.Context, email, password string) (string, error) {
	user, err := u.authRepo.FindByEmail(ctx, email)
	if err != nil {
		return "", errors.New("email atau password salah")
	}

	// Verifikasi password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return "", errors.New("email atau password salah")
	}

	// Generate JWT token
	token, err := infrastructure.GenerateToken(user.ID, string(user.Role))
	if err != nil {
		return "", errors.New("gagal membuat token")
	}

	return token, nil
}
