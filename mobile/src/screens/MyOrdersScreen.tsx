import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../config/api";
import { useCartStore } from "../store/cartStore";

type RootStackParamList = {
  Home: undefined;
  Menu: undefined;
  Cart: undefined;
  Payment: { orderId: string; amount: number };
  MyOrders: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "MyOrders">;

type OrderItem = {
  menu_name: string;
  quantity: number;
  price: number;
  subtotal: number;
  notes?: string;
};

type Order = {
  id: string;
  table_number: string;
  order_type: string;
  payment_method: string;
  total_amount: number;
  status: "pending" | "preparing" | "ready" | "done" | "cancelled";
  items: OrderItem[];
  created_at: string;
};

export default function MyOrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifiedOrderIds, setNotifiedOrderIds] = useState<string[]>([]);
  const navigation = useNavigation<NavigationProp>();
  const { tableNumber, lastOrderId } = useCartStore();

  useEffect(() => {
    fetchOrders();

    // Poll status pesanan setiap 3 detik
    const interval = setInterval(() => {
      fetchOrders();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      // Ambil seluruh order aktif di backend untuk meja ini
      const res = await api.get("/orders/active");
      const activeList: Order[] = res.data || [];

      // Filter order sesuai nomor meja
      const tableOrders = activeList.filter((o) => o.table_number === (tableNumber || "1"));
      setOrders(tableOrders);

      // Cek notifikasi pesanan siap (ready)
      tableOrders.forEach((o) => {
        if (o.status === "ready" && !notifiedOrderIds.includes(o.id)) {
          setNotifiedOrderIds((prev) => [...prev, o.id]);
          Alert.alert(
            "🔔 PESANAN SIAP DIAMBIL!",
            `Makanan Meja ${o.table_number} sudah selesai dimasak! Silakan ambil di counter dapur.`,
            [{ text: "Mengerti", style: "default" }]
          );
        }
      });
    } catch (err) {
      console.warn("Could not fetch table orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return { label: "⏳ Menunggu Dapur", bg: "#fef3c7", color: "#92400e", border: "#fde047" };
      case "preparing":
        return { label: "🔥 Sedang Dimasak", bg: "#eff6ff", color: "#1e40af", border: "#93c5fd" };
      case "ready":
        return { label: "🔔 SIAP DIAMBIL!", bg: "#ecfdf5", color: "#065f46", border: "#6ee7b7" };
      case "done":
        return { label: "✅ Selesai", bg: "#f3f4f6", color: "#374151", border: "#e5e7eb" };
      default:
        return { label: "⏳ Diproses", bg: "#f8fafc", color: "#475569", border: "#e2e8f0" };
    }
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const badge = getStatusBadge(item.status);
    const isReady = item.status === "ready";

    return (
      <View style={[styles.card, isReady && styles.cardReady]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderId}>Order #{item.id.substring(0, 14)}</Text>
            <Text style={styles.orderMeta}>
              Meja {item.table_number} • {item.order_type === "takeaway" ? "Takeaway" : "Dine In"}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        {/* Dynamic Notification Banner when Ready */}
        {isReady && (
          <View style={styles.readyAlertBanner}>
            <Text style={styles.readyAlertText}>
              🔔 Makanan sudah selesai dimasak! Silakan ambil di counter dapur.
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Item List */}
        <View style={styles.itemList}>
          {item.items?.map((it, idx) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemName}>
                {it.quantity}x {it.menu_name}
              </Text>
              <Text style={styles.itemPrice}>Rp {it.subtotal?.toLocaleString("id-ID")}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <Text style={styles.totalLabel}>Total Pembayaran</Text>
          <Text style={styles.totalValue}>Rp {item.total_amount?.toLocaleString("id-ID")}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Status Pesanan Saya</Text>
        <Text style={styles.headerSub}>Meja {tableNumber || "1"} • Live Status Track</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#533afd" style={styles.loader} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyTitle}>Belum Ada Pesanan Aktif</Text>
              <Text style={styles.emptySub}>Pesanan yang Anda buat dari meja ini akan muncul di sini secara realtime.</Text>
              <TouchableOpacity style={styles.orderNowBtn} onPress={() => navigation.navigate("Menu")}>
                <Text style={styles.orderNowBtnText}>Pesan Menu Sekarang</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    padding: 20,
    paddingTop: 56,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0d253d",
  },
  headerSub: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  cardReady: {
    borderColor: "#10B981",
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderId: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0d253d",
  },
  orderMeta: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  readyAlertBanner: {
    backgroundColor: "#ecfdf5",
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  readyAlertText: {
    color: "#065f46",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 12,
  },
  itemList: {
    gap: 6,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemName: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
  },
  itemPrice: {
    fontSize: 14,
    color: "#64748b",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 13,
    color: "#64748b",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#533afd",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0d253d",
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  orderNowBtn: {
    backgroundColor: "#533afd",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
  },
  orderNowBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});
