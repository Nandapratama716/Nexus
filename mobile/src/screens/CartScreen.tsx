import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../config/api";
import { useCartStore, CartItem } from "../store/cartStore";

type RootStackParamList = {
  Home: undefined;
  Menu: undefined;
  Cart: undefined;
  Payment: { orderId: string; amount: number };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Cart">;

export default function CartScreen() {
  const { items, tableNumber, addItem, removeItem, clearCart, getTotal } = useCartStore();
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (items.length === 0) return;

    setLoading(true);
    try {
      const orderItems = items.map((item) => ({
        menu_id: item.menu.id,
        menu_name: item.menu.name,
        quantity: item.quantity,
        price: item.menu.price,
      }));

      const payload = {
        table_number: tableNumber,
        items: orderItems,
      };

      const response = await api.post("/orders", payload);
      const order = response.data;
      
      clearCart();
      navigation.replace("Payment", { orderId: order.id, amount: order.total_amount });
    } catch (error) {
      console.error("Checkout failed:", error);
      Alert.alert("Checkout Failed", "Could not process your order at this time.");
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.menuName}>{item.menu.name}</Text>
        <Text style={styles.menuPrice}>Rp {(item.menu.price * item.quantity).toLocaleString("id-ID")}</Text>
      </View>
      <View style={styles.quantityControl}>
        <TouchableOpacity style={styles.qtyBtn} onPress={() => removeItem(item.menu.id)}>
          <Text style={styles.qtyBtnText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <TouchableOpacity style={styles.qtyBtn} onPress={() => addItem(item.menu)}>
          <Text style={styles.qtyBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.menu.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Your cart is empty.</Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>Rp {getTotal().toLocaleString("id-ID")}</Text>
        </View>
        
        <TouchableOpacity
          style={[styles.checkoutBtn, items.length === 0 && styles.checkoutBtnDisabled]}
          onPress={handleCheckout}
          disabled={items.length === 0 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.checkoutBtnText}>Checkout Order</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fcfcfc",
  },
  list: {
    padding: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#94a3b8",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardInfo: {
    flex: 1,
  },
  menuName: {
    fontSize: 18,
    color: "#0d253d",
    marginBottom: 4,
  },
  menuPrice: {
    fontSize: 15,
    color: "#64748b",
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  qtyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  qtyBtnText: {
    fontSize: 20,
    color: "#0d253d",
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#0d253d",
    minWidth: 24,
    textAlign: "center",
  },
  footer: {
    padding: 24,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingBottom: 40,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 20,
    color: "#64748b",
  },
  totalValue: {
    fontSize: 24,
    fontWeight: "500",
    color: "#0d253d",
  },
  checkoutBtn: {
    backgroundColor: "#533afd",
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: "center",
  },
  checkoutBtnDisabled: {
    backgroundColor: "#94a3b8",
  },
  checkoutBtnText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "500",
  },
});
