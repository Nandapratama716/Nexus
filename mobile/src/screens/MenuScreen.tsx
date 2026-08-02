import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  TextInput,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../config/api";
import { MenuItem, useCartStore } from "../store/cartStore";

import AIChatModal from "../components/AIChatModal";

type RootStackParamList = {
  Home: undefined;
  Menu: undefined;
  Cart: undefined;
  MyOrders: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Menu">;

export default function MenuScreen() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const navigation = useNavigation<NavigationProp>();
  const { items, addItem, removeItem, tableNumber } = useCartStore();

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    try {
      const response = await api.get("/menus");
      const availableMenus = response.data.filter((m: any) => m.is_available);
      setMenus(availableMenus);
    } catch (error) {
      console.error("Failed to fetch menus:", error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: "all", label: "Semua 🍽️" },
    { id: "food", label: "Makanan 🍲" },
    { id: "drink", label: "Minuman 🍹" },
    { id: "snack", label: "Cemilan 🍿" },
  ];

  const promos = [
    { id: "1", title: "Diskon 10%", code: "NEXUS10", desc: "Gunakan voucher NEXUS10 saat checkout!", bg: "#533afd" },
    { id: "2", title: "Potongan Rp 5rb", code: "HEMAT5K", desc: "Gunakan kode HEMAT5K min 20rb", bg: "#10B981" },
    { id: "3", title: "AI Assistant 🤖", code: "TANYA AI", desc: "Bingung pilih menu? Tanya ke Nexus AI!", bg: "#ea2261" },
  ];

  // Filter menus based on Category & Search Query
  const filteredMenus = menus.filter((menu) => {
    const matchesCategory =
      selectedCategory === "all" || menu.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesSearch =
      menu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (menu.description && menu.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Banner Carousel */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bannerScrollView}>
        {promos.map((promo) => (
          <View key={promo.id} style={[styles.bannerCard, { backgroundColor: promo.bg }]}>
            <View>
              <Text style={styles.bannerBadge}>{promo.code}</Text>
              <Text style={styles.bannerTitle}>{promo.title}</Text>
              <Text style={styles.bannerDesc}>{promo.desc}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari makanan atau minuman..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Text style={styles.clearSearch}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScrollView}>
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, isActive && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderItem = ({ item }: { item: MenuItem }) => {
    const isSoldOut = !item.is_available || (item.stock_qty !== undefined && item.stock_qty <= 0);
    const cartItem = items.find((i) => i.menu.id === item.id);
    const quantityInCart = cartItem ? cartItem.quantity : 0;

    return (
      <View style={styles.card}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.menuImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>🍽️</Text>
          </View>
        )}

        <View style={styles.cardInfo}>
          <Text style={styles.menuName}>{item.name}</Text>
          {item.description ? (
            <Text style={styles.menuDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          <Text style={styles.menuPrice}>Rp {item.price.toLocaleString("id-ID")}</Text>

          {item.stock_qty !== undefined && item.stock_qty > 0 && (
            <Text style={styles.stockBadge}>Sisa {item.stock_qty} porsi</Text>
          )}
        </View>

        <View style={styles.actionContainer}>
          {quantityInCart > 0 ? (
            <View style={styles.quantityCounter}>
              <TouchableOpacity style={styles.counterBtn} onPress={() => removeItem(item.id)}>
                <Text style={styles.counterBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.counterNumber}>{quantityInCart}</Text>
              <TouchableOpacity style={styles.counterBtn} onPress={() => addItem(item)}>
                <Text style={styles.counterBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.addButton, isSoldOut && styles.addButtonDisabled]}
              onPress={() => addItem(item)}
              disabled={isSoldOut}
            >
              <Text style={[styles.addButtonText, isSoldOut && styles.addButtonTextDisabled]}>
                {isSoldOut ? "Sold Out" : "+ Tambah"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.restaurantBrand}>NEXUS POS</Text>
          <Text style={styles.headerTitle}>Table {tableNumber || "1"}</Text>
        </View>
        <View style={styles.headerRightBtns}>
          <TouchableOpacity style={styles.myOrdersButton} onPress={() => navigation.navigate("MyOrders")}>
            <Text style={styles.myOrdersButtonText}>📋 Pesanan Saya</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cartButton} onPress={() => navigation.navigate("Cart")}>
            <Text style={styles.cartButtonText}>🛒 ({totalItems})</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#533afd" style={styles.loader} />
      ) : (
        <FlatList
          data={filteredMenus}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>Tidak ada menu yang sesuai</Text>
            </View>
          }
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
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  restaurantBrand: {
    fontSize: 11,
    fontWeight: "700",
    color: "#533afd",
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "300",
    color: "#0d253d",
  },
  headerRightBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  myOrdersButton: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  myOrdersButtonText: {
    color: "#0d253d",
    fontWeight: "600",
    fontSize: 12,
  },
  cartButton: {
    backgroundColor: "#ea2261", // ruby
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  cartButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 13,
  },
  headerContainer: {
    marginBottom: 12,
  },
  bannerScrollView: {
    marginVertical: 12,
    paddingLeft: 4,
  },
  bannerCard: {
    width: 240,
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
    justifyContent: "space-between",
  },
  bannerBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 6,
  },
  bannerTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  bannerDesc: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12,
    lineHeight: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0d253d",
  },
  clearSearch: {
    color: "#94a3b8",
    fontSize: 14,
    paddingHorizontal: 6,
  },
  categoryScrollView: {
    marginVertical: 8,
  },
  categoryChip: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  categoryChipActive: {
    backgroundColor: "#533afd",
    borderColor: "#533afd",
  },
  categoryChipText: {
    fontSize: 13,
    color: "#64748b",
  },
  categoryChipTextActive: {
    color: "#ffffff",
    fontWeight: "600",
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
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  menuImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: "#f1f5f9",
  },
  imagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderText: {
    fontSize: 28,
  },
  cardInfo: {
    flex: 1,
    paddingRight: 8,
  },
  menuName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0d253d",
    marginBottom: 2,
  },
  menuDesc: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 16,
    marginBottom: 4,
  },
  menuPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0d253d",
  },
  stockBadge: {
    fontSize: 11,
    color: "#10B981",
    marginTop: 2,
    fontWeight: "500",
  },
  actionContainer: {
    alignItems: "flex-end",
  },
  addButton: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
  },
  addButtonDisabled: {
    backgroundColor: "#f1f5f9",
  },
  addButtonText: {
    color: "#533afd",
    fontWeight: "600",
    fontSize: 13,
  },
  addButtonTextDisabled: {
    color: "#94a3b8",
  },
  quantityCounter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 100,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#533afd",
    justifyContent: "center",
    alignItems: "center",
  },
  counterBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  counterNumber: {
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: "700",
    color: "#533afd",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyText: {
    color: "#94a3b8",
    fontSize: 14,
  },
});
