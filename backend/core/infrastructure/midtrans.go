package infrastructure

import (
	"crypto/sha512"
	"encoding/hex"
	"fmt"
	"log"
)

// MockMidtransClient merepresentasikan client Midtrans palsu
type MockMidtransClient struct {
	ServerKey string
}

// NewMockMidtransClient membuat instance client
func NewMockMidtransClient(serverKey string) *MockMidtransClient {
	return &MockMidtransClient{
		ServerKey: serverKey,
	}
}

// GenerateMockQRIS mensimulasikan respons Snap API untuk QRIS
func (m *MockMidtransClient) GenerateMockQRIS(orderID string, amount float64) string {
	log.Printf("[Mock Midtrans] Generate QRIS for Order %s (Rp%.2f)\n", orderID, amount)
	// Return mock URL gambar QRIS
	return fmt.Sprintf("https://mock-qris.com/pay/%s", orderID)
}

// VerifySignatureKey memverifikasi SHA512 dari Webhook Midtrans
// Rumus Midtrans: SHA512(order_id + status_code + gross_amount + server_key)
func (m *MockMidtransClient) VerifySignatureKey(signatureKey, orderID, statusCode, grossAmount string) bool {
	payload := orderID + statusCode + grossAmount + m.ServerKey
	
	hash := sha512.Sum512([]byte(payload))
	expectedSignature := hex.EncodeToString(hash[:])
	
	return signatureKey == expectedSignature
}
