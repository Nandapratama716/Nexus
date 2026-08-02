import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../config/api";
import { MenuItem, useCartStore } from "../store/cartStore";

import AIChatModal from "../components/AIChatModal";

type RootStackParamList = {
  Home: undefined;
  Menu: undefined;
  Cart: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Menu">;

export default function MenuScreen() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<NavigationProp>();
  const { items, addItem, tableNumber } = useCartStore();

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    try {
      const response = await api.get("/menus");
      // filter only available menus
      const availableMenus = response.data.filter((m: any) => m.is_available);
      setMenus(availableMenus);
    } catch (error) {
      console.error("Failed to fetch menus:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: MenuItem }) => {
    const stock = item.stock_qty ?? 0;
    const isSoldOut = !item.is_available || (item.stock_qty !== undefined && item.stock_qty <= 0);

    return (
      <View style={styles.card}>
        <View style={styles.cardInfo}>
          <Text style={styles.menuName}>{item.name}</Text>
          <Text style={styles.menuPrice}>Rp {item.price.toLocaleString("id-ID")}</Text>
          {item.stock_qty !== undefined && item.stock_qty > 0 && (
            <Text style={styles.stockBadge}>Sisa {item.stock_qty} porsi</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.addButton, isSoldOut && styles.addButtonDisabled]}
          onPress={() => addItem(item)}
          disabled={isSoldOut}
        >
          <Text style={[styles.addButtonText, isSoldOut && styles.addButtonTextDisabled]}>
            {isSoldOut ? "Sold Out" : "Add"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Table {tableNumber}</Text>
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => navigation.navigate("Cart")}
        >
          <Text style={styles.cartButtonText}>Cart ({totalItems})</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#533afd" style={styles.loader} />
      ) : (
        <FlatList
          data={menus}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Floating AI Order Assistant */}
      <AIChatModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fcfcfc",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    paddingTop: 60,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "300",
    color: "#0d253d",
  },
  cartButton: {
    backgroundColor: "#ea2261", // ruby
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
  },
  cartButtonText: {
    color: "#ffffff",
    fontWeight: "500",
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
  stockBadge: {
    fontSize: 12,
    color: "#10B981",
    marginTop: 4,
    fontWeight: "500",
  },
  addButton: {
    backgroundColor: "#eff6ff", // light primary
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
  },
  addButtonDisabled: {
    backgroundColor: "#f1f5f9",
  },
  addButtonText: {
    color: "#533afd",
    fontWeight: "500",
  },
  addButtonTextDisabled: {
    color: "#94a3b8",
  },
});
