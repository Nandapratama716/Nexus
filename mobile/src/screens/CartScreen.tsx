import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../config/api";
import { useCartStore, CartItem } from "../store/cartStore";

type RootStackParamList = {
  Home: undefined;
  Menu: undefined;
  Cart: undefined;
  Payment: { orderId: string; amount: number; paymentMethod: string; cashPaid: number; cashChange: number };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Cart">;

export default function CartScreen() {
  const { items, tableNumber, orderType, setOrderType, addItem, removeItem, setItemNotes, clearCart, getTotal } = useCartStore();
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);

  // Notes modal
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState("");

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "cash">("qris");

  // Cash calculator
  const [cashModalVisible, setCashModalVisible] = useState(false);
  const [cashPaidInput, setCashPaidInput] = useState("");

  const total = getTotal();

  const openNotesModal = (menuId: string, currentNotes: string) => {
    setEditingItemId(menuId);
    setTempNotes(currentNotes);
    setNotesModalVisible(true);
  };

  const saveNotes = () => {
    if (editingItemId) {
      setItemNotes(editingItemId, tempNotes);
    }
    setNotesModalVisible(false);
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;

    if (paymentMethod === "cash") {
      setCashPaidInput("");
      setCashModalVisible(true);
      return;
    }

    // QRIS flow (existing)
    await submitOrder(0);
  };

  const handleCashSubmit = async () => {
    const cashPaid = parseFloat(cashPaidInput);
    if (isNaN(cashPaid) || cashPaid < total) {
      Alert.alert("Uang Tidak Cukup", `Minimal bayar Rp ${total.toLocaleString("id-ID")}`);
      return;
    }
    setCashModalVisible(false);
    await submitOrder(cashPaid);
  };

  const submitOrder = async (cashPaid: number) => {
    setLoading(true);
    try {
      const orderItems = items.map((item) => ({
        menu_id: item.menu.id,
        menu_name: item.menu.name,
        quantity: item.quantity,
        price: item.menu.price,
        notes: item.notes || "",
      }));

      const payload = {
        table_number: tableNumber,
        order_type: orderType,
        payment_method: paymentMethod,
        cash_paid: paymentMethod === "cash" ? cashPaid : 0,
        items: orderItems,
      };

      const response = await api.post("/orders", payload);
      const order = response.data;

      const cashChange = paymentMethod === "cash" ? cashPaid - total : 0;

      clearCart();
      navigation.replace("Payment", {
        orderId: order.id,
        amount: order.total_amount,
        paymentMethod,
        cashPaid,
        cashChange,
      });
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
        {item.notes ? (
          <TouchableOpacity onPress={() => openNotesModal(item.menu.id, item.notes)}>
            <Text style={styles.notesText}>📝 {item.notes}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => openNotesModal(item.menu.id, "")}>
            <Text style={styles.addNotesBtn}>+ Add notes</Text>
          </TouchableOpacity>
        )}
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
        {/* Order Type Toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, orderType === "dine_in" && styles.toggleBtnActive]}
            onPress={() => setOrderType("dine_in")}
          >
            <Text style={[styles.toggleText, orderType === "dine_in" && styles.toggleTextActive]}>🍽️ Dine In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, orderType === "takeaway" && styles.toggleBtnActive]}
            onPress={() => setOrderType("takeaway")}
          >
            <Text style={[styles.toggleText, orderType === "takeaway" && styles.toggleTextActive]}>🥡 Takeaway</Text>
          </TouchableOpacity>
        </View>

        {/* Payment Method Toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, paymentMethod === "qris" && styles.toggleBtnActive]}
            onPress={() => setPaymentMethod("qris")}
          >
            <Text style={[styles.toggleText, paymentMethod === "qris" && styles.toggleTextActive]}>📱 QRIS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, paymentMethod === "cash" && styles.toggleBtnActive]}
            onPress={() => setPaymentMethod("cash")}
          >
            <Text style={[styles.toggleText, paymentMethod === "cash" && styles.toggleTextActive]}>💵 Cash</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>Rp {total.toLocaleString("id-ID")}</Text>
        </View>

        <TouchableOpacity
          style={[styles.checkoutBtn, items.length === 0 && styles.checkoutBtnDisabled]}
          onPress={handleCheckout}
          disabled={items.length === 0 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.checkoutBtnText}>
              {paymentMethod === "cash" ? "Pay with Cash" : "Pay with QRIS"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Notes Modal */}
      <Modal visible={notesModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Item Notes</Text>
            <Text style={styles.modalSubtitle}>Pedas level, tanpa bawang, less ice, dll.</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="e.g. Pedas level 3, tanpa daun bawang"
              placeholderTextColor="#94a3b8"
              value={tempNotes}
              onChangeText={setTempNotes}
              multiline
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setNotesModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveNotes}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Cash Calculator Modal */}
      <Modal visible={cashModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💵 Cash Payment</Text>
            <Text style={styles.modalSubtitle}>
              Total: Rp {total.toLocaleString("id-ID")}
            </Text>
            <TextInput
              style={styles.cashInput}
              placeholder="Uang diterima (Rp)"
              placeholderTextColor="#94a3b8"
              value={cashPaidInput}
              onChangeText={setCashPaidInput}
              keyboardType="numeric"
            />
            {cashPaidInput && parseFloat(cashPaidInput) >= total && (
              <View style={styles.changeBox}>
                <Text style={styles.changeLabel}>Kembalian</Text>
                <Text style={styles.changeValue}>
                  Rp {(parseFloat(cashPaidInput) - total).toLocaleString("id-ID")}
                </Text>
              </View>
            )}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setCashModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleCashSubmit}>
                <Text style={styles.modalSaveText}>Confirm Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fcfcfc" },
  list: { padding: 16 },
  emptyState: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 16, color: "#94a3b8" },
  card: {
    backgroundColor: "#ffffff", padding: 16, borderRadius: 12, marginBottom: 12,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderWidth: 1, borderColor: "#e2e8f0",
  },
  cardInfo: { flex: 1 },
  menuName: { fontSize: 18, color: "#0d253d", marginBottom: 4 },
  menuPrice: { fontSize: 15, color: "#64748b" },
  notesText: { fontSize: 13, color: "#533afd", marginTop: 4, fontStyle: "italic" },
  addNotesBtn: { fontSize: 13, color: "#94a3b8", marginTop: 4 },
  quantityControl: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc",
    borderRadius: 100, borderWidth: 1, borderColor: "#e2e8f0",
  },
  qtyBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  qtyBtnText: { fontSize: 20, color: "#0d253d" },
  quantityText: { fontSize: 16, fontWeight: "500", color: "#0d253d", minWidth: 24, textAlign: "center" },
  footer: {
    padding: 24, backgroundColor: "#ffffff", borderTopWidth: 1,
    borderTopColor: "#e2e8f0", paddingBottom: 40,
  },
  toggleRow: {
    flexDirection: "row", marginBottom: 12, gap: 8,
  },
  toggleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 100, borderWidth: 1,
    borderColor: "#e2e8f0", alignItems: "center", backgroundColor: "#f8fafc",
  },
  toggleBtnActive: {
    backgroundColor: "#533afd", borderColor: "#533afd",
  },
  toggleText: { fontSize: 14, color: "#64748b", fontWeight: "500" },
  toggleTextActive: { color: "#ffffff" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  totalLabel: { fontSize: 20, color: "#64748b" },
  totalValue: { fontSize: 24, fontWeight: "500", color: "#0d253d" },
  checkoutBtn: {
    backgroundColor: "#533afd", paddingVertical: 16, borderRadius: 100, alignItems: "center",
  },
  checkoutBtnDisabled: { backgroundColor: "#94a3b8" },
  checkoutBtnText: { color: "#ffffff", fontSize: 18, fontWeight: "500" },
  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(13,37,61,0.5)", justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: "300", color: "#0d253d", marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: "#64748b", marginBottom: 16 },
  notesInput: {
    borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 14,
    fontSize: 15, color: "#0d253d", minHeight: 80, textAlignVertical: "top",
  },
  cashInput: {
    borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 16, padding: 16,
    fontSize: 24, textAlign: "center", color: "#0d253d",
  },
  changeBox: {
    alignItems: "center", marginTop: 16, padding: 16,
    backgroundColor: "#f0fdf4", borderRadius: 12,
  },
  changeLabel: { fontSize: 14, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 },
  changeValue: { fontSize: 28, fontWeight: "500", color: "#10B981", marginTop: 4 },
  modalBtnRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 100, borderWidth: 1,
    borderColor: "#e2e8f0", alignItems: "center",
  },
  modalCancelText: { color: "#64748b", fontSize: 15 },
  modalSaveBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 100,
    backgroundColor: "#533afd", alignItems: "center",
  },
  modalSaveText: { color: "#ffffff", fontSize: 15, fontWeight: "500" },
});
