import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform, Image, ActivityIndicator } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { generateThermalReceiptText } from "../utils/thermalReceipt";
import { api } from "../config/api";

type RootStackParamList = {
  Home: undefined;
  Menu: undefined;
  Cart: undefined;
  Payment: {
    orderId: string;
    subtotal: number;
    promoCode: string;
    discountAmount: number;
    taxAmount: number;
    serviceCharge: number;
    amount: number;
    paymentMethod: string;
    cashPaid: number;
    cashChange: number;
    tableNumber: string;
    orderType: string;
    items: Array<{ name: string; quantity: number; price: number; subtotal: number; notes?: string }>;
  };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Payment">;

export default function PaymentScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const params = route.params || {};

  const {
    orderId = "N/A",
    subtotal = 0,
    promoCode = "",
    discountAmount = 0,
    taxAmount = 0,
    serviceCharge = 0,
    amount = 0,
    paymentMethod = "qris",
    cashPaid = 0,
    cashChange = 0,
    tableNumber = "-",
    orderType = "dine_in",
    items = [],
  } = params;

  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>("pending");
  const [paymentStatus, setPaymentStatus] = useState<string>(paymentMethod === "cash" ? "settled" : "pending");
  const [simulatingPay, setSimulatingPay] = useState(false);

  const isCash = paymentMethod === "cash";

  useEffect(() => {
    if (!orderId || orderId === "N/A") return;

    // Poll status pesanan & status pembayaran dari backend Go setiap 3 detik
    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/orders/${orderId}`);
        if (response.data) {
          if (response.data.status) setCurrentStatus(response.data.status);
          if (response.data.payment_status) setPaymentStatus(response.data.payment_status);
        }
      } catch (err) {
        console.warn("Error polling order status:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [orderId]);

  // Simulasi Pembayaran QRIS (Trigger Webhook Midtrans Settlement)
  const handleSimulateQRISPayment = async () => {
    setSimulatingPay(true);
    try {
      await api.post("/payment/callback", {
        order_id: orderId,
        transaction_status: "settlement",
        gross_amount: amount.toString(),
      });
      setPaymentStatus("settled");
    } catch (err) {
      console.error("Failed to simulate QRIS payment:", err);
    } finally {
      setSimulatingPay(false);
    }
  };

  const receiptText = generateThermalReceiptText({
    orderId,
    tableNumber,
    orderType,
    items,
    subtotal: subtotal || amount,
    promoCode,
    discountAmount,
    taxAmount,
    serviceCharge,
    totalAmount: amount,
    paymentMethod,
    cashPaid,
    cashChange,
  });

  const getStatusBadge = () => {
    switch (currentStatus) {
      case "pending":
        return { title: "⏳ Menunggu Dapur", desc: "Pesanan Anda sudah masuk ke sistem KDS.", bg: "#fef3c7", border: "#fde047", color: "#92400e" };
      case "preparing":
        return { title: "🔥 Sedang Dimasak", desc: "Koki sedang menyiapkan pesanan Anda di dapur.", bg: "#eff6ff", border: "#93c5fd", color: "#1e40af" };
      case "ready":
        return { title: "🔔 Pesanan Siap!", desc: "Pesanan sudah selesai. Silakan ambil di counter!", bg: "#ecfdf5", border: "#6ee7b7", color: "#065f46" };
      case "done":
        return { title: "✅ Pesanan Selesai", desc: "Terima kasih! Selamat menikmati hidangan Anda.", bg: "#f3f4f6", border: "#e5e7eb", color: "#374151" };
      default:
        return { title: "⏳ Diproses", desc: "Sedang memproses pesanan...", bg: "#f8fafc", border: "#e2e8f0", color: "#475569" };
    }
  };

  const statusInfo = getStatusBadge();
  const qrisQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=NEXUS_QRIS_PAYMENT_${orderId}_${amount}`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <Text style={styles.title}>
          {paymentStatus === "settled" ? "Pembayaran Lunas! ✅" : "Menunggu Pembayaran QRIS ⏳"}
        </Text>
        <Text style={styles.subtitle}>Order ID: {orderId.substring(0, 18)}</Text>

        {/* Realtime Order Status Tracker Box */}
        <View style={[styles.statusBox, { backgroundColor: statusInfo.bg, borderColor: statusInfo.border }]}>
          <Text style={[styles.statusTitle, { color: statusInfo.color }]}>{statusInfo.title}</Text>
          <Text style={styles.statusDesc}>{statusInfo.desc}</Text>

          {/* Stepper Progress Indicator */}
          <View style={styles.stepperRow}>
            <View style={[styles.stepDot, (currentStatus === "pending" || currentStatus === "preparing" || currentStatus === "ready" || currentStatus === "done") && styles.stepDotActive]}>
              <Text style={styles.stepNum}>1</Text>
            </View>
            <View style={[styles.stepLine, (currentStatus === "preparing" || currentStatus === "ready" || currentStatus === "done") && styles.stepLineActive]} />
            <View style={[styles.stepDot, (currentStatus === "preparing" || currentStatus === "ready" || currentStatus === "done") && styles.stepDotActive]}>
              <Text style={styles.stepNum}>2</Text>
            </View>
            <View style={[styles.stepLine, (currentStatus === "ready" || currentStatus === "done") && styles.stepLineActive]} />
            <View style={[styles.stepDot, (currentStatus === "ready" || currentStatus === "done") && styles.stepDotActive]}>
              <Text style={styles.stepNum}>3</Text>
            </View>
          </View>
          <View style={styles.stepperLabels}>
            <Text style={styles.stepLabel}>Order</Text>
            <Text style={styles.stepLabel}>Masak</Text>
            <Text style={styles.stepLabel}>Siap</Text>
          </View>
        </View>

        {/* Financial Summary */}
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Total Bayar</Text>
          <Text style={styles.amountValue}>Rp {amount.toLocaleString("id-ID")}</Text>
        </View>

        {/* Dynamic Payment Method Card */}
        {isCash ? (
          /* Cash Breakdown Card */
          <View style={styles.cashReceipt}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Metode Pembayaran</Text>
              <Text style={styles.receiptValue}>💵 Tunai / Cash</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Uang Diterima</Text>
              <Text style={styles.receiptValue}>Rp {cashPaid.toLocaleString("id-ID")}</Text>
            </View>
            <View style={[styles.receiptRow, styles.receiptRowHighlight]}>
              <Text style={styles.receiptLabelBold}>Kembalian</Text>
              <Text style={styles.receiptValueBold}>Rp {cashChange.toLocaleString("id-ID")}</Text>
            </View>
          </View>
        ) : (
          /* QRIS Interactive Card */
          <View style={styles.qrisCard}>
            <Text style={styles.qrisTitle}>📱 Kode QRIS Pembayaran (Midtrans)</Text>

            {paymentStatus === "settled" ? (
              <View style={styles.qrisPaidBox}>
                <Text style={styles.qrisPaidIcon}>✅</Text>
                <Text style={styles.qrisPaidTitle}>PEMBAYARAN QRIS LUNAS</Text>
                <Text style={styles.qrisPaidSub}>Transaksi telah berhasil diverifikasi oleh Midtrans.</Text>
              </View>
            ) : (
              <View style={styles.qrisPendingBox}>
                <Text style={styles.qrisInstruction}>Scan QRIS di bawah ini menggunakan GoPay, OVO, Dana, BCA, atau E-Wallet pilihan Anda:</Text>
                <Image source={{ uri: qrisQrUrl }} style={styles.qrisQrImage} />
                <Text style={styles.qrisBrandText}>NEXUS POS • MIDTRANS QRIS NATIONAL</Text>

                <TouchableOpacity
                  style={styles.paySimulateBtn}
                  onPress={handleSimulateQRISPayment}
                  disabled={simulatingPay}
                >
                  {simulatingPay ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.paySimulateBtnText}>⚡ Konfirmasi / Simulasi Bayar QRIS</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Receipt Action Button */}
        <TouchableOpacity
          style={styles.printBtn}
          onPress={() => setPrintModalVisible(true)}
        >
          <Text style={styles.printBtnText}>🖨️ Struk Pembayaran / Thermal Receipt</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.homeBtnText}>Kembali ke Halaman Utama</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Thermal Struk Preview */}
      <Modal visible={printModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🖨️ Struk Pembayaran Thermal (80mm)</Text>
            <ScrollView style={styles.receiptPaper}>
              <Text style={styles.receiptPaperText}>{receiptText}</Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setPrintModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    alignItems: "center",
  },
  card: {
    width: "100%",
    backgroundColor: "#ffffff",
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0d253d",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 20,
  },
  statusBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    alignItems: "center",
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  statusDesc: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    marginBottom: 16,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "80%",
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#cbd5e1",
    justifyContent: "center",
    alignItems: "center",
  },
  stepDotActive: {
    backgroundColor: "#533afd",
  },
  stepNum: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: "#cbd5e1",
  },
  stepLineActive: {
    backgroundColor: "#533afd",
  },
  stepperLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "85%",
    marginTop: 6,
  },
  stepLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
  },
  amountBox: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  amountLabel: {
    fontSize: 12,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0d253d",
  },
  printBtn: {
    backgroundColor: "#eff6ff",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  printBtnText: {
    color: "#1d4ed8",
    fontWeight: "600",
    fontSize: 14,
  },
  cashReceipt: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
    gap: 8,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  receiptRowHighlight: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
    marginTop: 4,
  },
  receiptLabel: {
    fontSize: 13,
    color: "#64748b",
  },
  receiptValue: {
    fontSize: 13,
    color: "#0d253d",
    fontWeight: "500",
  },
  receiptLabelBold: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0d253d",
  },
  receiptValueBold: {
    fontSize: 15,
    fontWeight: "700",
    color: "#10B981",
  },
  qrisCard: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  qrisTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0d253d",
    marginBottom: 12,
    textAlign: "center",
  },
  qrisPendingBox: {
    alignItems: "center",
    width: "100%",
  },
  qrisInstruction: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 16,
  },
  qrisQrImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginBottom: 10,
  },
  qrisBrandText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 1,
    marginBottom: 16,
  },
  paySimulateBtn: {
    width: "100%",
    backgroundColor: "#10B981",
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  paySimulateBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  qrisPaidBox: {
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    padding: 20,
    borderRadius: 14,
    width: "100%",
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  qrisPaidIcon: {
    fontSize: 36,
    marginBottom: 6,
  },
  qrisPaidTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#065f46",
    marginBottom: 4,
  },
  qrisPaidSub: {
    fontSize: 12,
    color: "#047857",
    textAlign: "center",
  },
  homeBtn: {
    backgroundColor: "#533afd",
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: "center",
  },
  homeBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0d253d",
    marginBottom: 12,
  },
  receiptPaper: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    maxHeight: 400,
  },
  receiptPaperText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    lineHeight: 18,
    color: "#1e293b",
  },
  closeBtn: {
    marginTop: 16,
    backgroundColor: "#0d253d",
    paddingVertical: 12,
    borderRadius: 100,
    alignItems: "center",
  },
  closeBtnText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
