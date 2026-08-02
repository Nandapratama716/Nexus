import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RootStackParamList = {
  Home: undefined;
  Menu: undefined;
  Cart: undefined;
  Payment: { orderId: string; amount: number; paymentMethod: string; cashPaid: number; cashChange: number };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Payment">;

export default function PaymentScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const {
    orderId = "N/A",
    amount = 0,
    paymentMethod = "qris",
    cashPaid = 0,
    cashChange = 0,
  } = route.params || {};

  const isCash = paymentMethod === "cash";

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>
          {isCash ? "Payment Complete! ✅" : "Order Placed!"}
        </Text>
        <Text style={styles.subtitle}>Order ID: {orderId}</Text>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Total</Text>
          <Text style={styles.amountValue}>Rp {amount.toLocaleString("id-ID")}</Text>
        </View>

        {isCash ? (
          /* Cash Receipt */
          <View style={styles.cashReceipt}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Payment Method</Text>
              <Text style={styles.receiptValue}>💵 Cash</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Cash Received</Text>
              <Text style={styles.receiptValue}>Rp {cashPaid.toLocaleString("id-ID")}</Text>
            </View>
            <View style={styles.receiptDivider} />
            <View style={styles.receiptRow}>
              <Text style={styles.changeLabel}>Change</Text>
              <Text style={styles.changeValue}>Rp {cashChange.toLocaleString("id-ID")}</Text>
            </View>
            <Text style={styles.settledBadge}>SETTLED</Text>
          </View>
        ) : (
          /* QRIS Display */
          <>
            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrText}>MOCK QRIS</Text>
              <Text style={styles.qrSubText}>Midtrans Sandbox</Text>
            </View>
            <Text style={styles.instruction}>
              Please show this screen to the customer for payment, or wait for webhook confirmation.
            </Text>
          </>
        )}
      </View>

      <TouchableOpacity
        style={styles.doneBtn}
        onPress={() => navigation.navigate("Home")}
      >
        <Text style={styles.doneBtnText}>New Order</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d253d",
    padding: 24,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "300",
    color: "#0d253d",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748b",
    marginBottom: 32,
  },
  amountBox: {
    alignItems: "center",
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 14,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: "500",
    color: "#533afd",
  },
  // Cash Receipt
  cashReceipt: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  receiptLabel: {
    fontSize: 14,
    color: "#64748b",
  },
  receiptValue: {
    fontSize: 14,
    color: "#0d253d",
    fontWeight: "500",
  },
  receiptDivider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 12,
  },
  changeLabel: {
    fontSize: 16,
    color: "#0d253d",
    fontWeight: "500",
  },
  changeValue: {
    fontSize: 20,
    color: "#10B981",
    fontWeight: "600",
  },
  settledBadge: {
    alignSelf: "center",
    marginTop: 16,
    backgroundColor: "#10B981",
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 100,
    overflow: "hidden",
    letterSpacing: 2,
  },
  // QRIS
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: "#f8fafc",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  qrText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#94a3b8",
  },
  qrSubText: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 4,
  },
  instruction: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
  },
  doneBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: "center",
    marginTop: 24,
  },
  doneBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
  },
});
