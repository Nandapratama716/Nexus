package infrastructure

import (
	"crypto/sha512"
	"encoding/hex"
	"log"

	"github.com/midtrans/midtrans-go"
	"github.com/midtrans/midtrans-go/snap"
)

// MidtransClient pembungkus SDK Midtrans resmi
type MidtransClient struct {
	ServerKey    string
	IsProduction bool
	snapClient   snap.Client
}

// NewMidtransClient menginisialisasi SDK Midtrans resmi (Sandbox / Production)
func NewMidtransClient() *MidtransClient {
	serverKey := getEnv("MIDTRANS_SERVER_KEY", "SB-Mid-server-MOCK-KEY-12345")
	isProd := getEnv("MIDTRANS_IS_PRODUCTION", "false") == "true"

	var env midtrans.EnvironmentType
	if isProd {
		env = midtrans.Production
		log.Println("[Midtrans] Inisialisasi Mode PRODUCTION")
	} else {
		env = midtrans.Sandbox
		log.Println("[Midtrans] Inisialisasi Mode SANDBOX (Gratis untuk Pengujian)")
	}

	var sClient snap.Client
	sClient.New(serverKey, env)

	return &MidtransClient{
		ServerKey:    serverKey,
		IsProduction: isProd,
		snapClient:   sClient,
	}
}

// CreateSnapTransaction membuat transaksi Snap / QRIS resmi ke Midtrans
func (m *MidtransClient) CreateSnapTransaction(orderID string, amount int64, customerName, customerEmail string) (*snap.Response, error) {
	req := &snap.Request{
		TransactionDetails: midtrans.TransactionDetails{
			OrderID:  orderID,
			GrossAmt: amount,
		},
		CustomerDetail: &midtrans.CustomerDetails{
			FName: customerName,
			Email: customerEmail,
		},
		EnabledPayments: []snap.SnapPaymentType{
			snap.SnapPaymentType("qris"),
			snap.SnapPaymentType("gopay"),
			snap.SnapPaymentType("shopeepay"),
			snap.SnapPaymentType("bank_transfer"),
		},
	}

	snapResp, err := m.snapClient.CreateTransaction(req)
	if err != nil {
		log.Printf("[Midtrans API Error] Gagal membuat Snap Transaction: %v", err)
		return nil, err
	}

	return snapResp, nil
}

// VerifySignatureKey memverifikasi HMAC SHA512 dari Webhook Notification Midtrans
// Rumus Midtrans: SHA512(order_id + status_code + gross_amount + server_key)
func (m *MidtransClient) VerifySignatureKey(signatureKey, orderID, statusCode, grossAmount string) bool {
	payload := orderID + statusCode + grossAmount + m.ServerKey

	hash := sha512.Sum512([]byte(payload))
	expectedSignature := hex.EncodeToString(hash[:])

	return signatureKey == expectedSignature
}
