import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RootStackParamList = {
  Home: undefined;
  Menu: undefined;
  Cart: undefined;
  Payment: { orderId: string; amount: number };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Payment">;

export default function PaymentScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const { orderId, amount } = route.params || { orderId: "N/A", amount: 0 };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Order Placed!</Text>
        <Text style={styles.subtitle}>Order ID: {orderId}</Text>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Total to pay</Text>
          <Text style={styles.amountValue}>Rp {amount.toLocaleString("id-ID")}</Text>
        </View>

        <View style={styles.qrPlaceholder}>
          <Text style={styles.qrText}>MOCK QRIS</Text>
          <Text style={styles.qrSubText}>Midtrans Sandbox</Text>
        </View>
        
        <Text style={styles.instruction}>
          Please show this screen to the customer for payment, or wait for webhook confirmation.
        </Text>
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
    backgroundColor: "#0d253d", // brand-dark
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
    marginBottom: 32,
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
