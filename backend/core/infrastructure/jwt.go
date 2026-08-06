package infrastructure

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims payload JWT yang menyertakan informasi pengguna dan tenant
type Claims struct {
	UserID   string `json:"user_id"`
	Role     string `json:"role"`
	TenantID string `json:"tenant_id"`
	StoreID  string `json:"store_id"`
	jwt.RegisteredClaims
}

func getJWTSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "default-dev-secret-change-in-production"
	}
	return []byte(secret)
}

// GenerateToken buat JWT token baru dengan claims tenant_id dan store_id
func GenerateToken(userID, role, tenantID, storeID string) (string, error) {
	if tenantID == "" {
		tenantID = "default-tenant"
	}
	if storeID == "" {
		storeID = "store-01"
	}

	claims := &Claims{
		UserID:   userID,
		Role:     role,
		TenantID: tenantID,
		StoreID:  storeID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(getJWTSecret())
}

// ValidateToken verifikasi dan parse JWT token
func ValidateToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("metode signing tidak valid")
		}
		return getJWTSecret(), nil
	})

	if err != nil || !token.Valid {
		return nil, errors.New("token tidak valid atau sudah kedaluwarsa")
	}

	claims, ok := token.Claims.(*Claims)
	if !ok {
		return nil, errors.New("gagal parse claims")
	}

	return claims, nil
}
