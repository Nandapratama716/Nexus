import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useCartStore } from "../store/cartStore";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../config/api";

type RootStackParamList = {
  Home: undefined;
  Menu: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Home">;

export default function HomeScreen() {
  const [table, setTable] = useState("");
  const [occupiedTables, setOccupiedTables] = useState<string[]>([]);
  const navigation = useNavigation<NavigationProp>();
  const setTableNumber = useCartStore((state) => state.setTableNumber);
  const setOrderType = useCartStore((state) => state.setOrderType);

  useEffect(() => {
    fetchOccupiedTables();
  }, []);

  const fetchOccupiedTables = async () => {
    try {
      const response = await api.get("/orders/tables/occupied");
      setOccupiedTables(response.data || []);
    } catch (err) {
      console.warn("Could not fetch occupied tables:", err);
    }
  };

  const handleStartTakeaway = () => {
    setTableNumber("Takeaway");
    setOrderType("takeaway");
    navigation.navigate("Menu");
  };

  const handleStart = (selectedTable?: string) => {
    const tableToUse = selectedTable || table.trim();
    if (!tableToUse) return;
    setTableNumber(tableToUse);
    setOrderType("dine_in");
    navigation.navigate("Menu");
  };

  const quickTables = ["1", "2", "3", "4", "5", "6", "VIP 1"];
  const isSelectedOccupied = occupiedTables.includes(table.trim());

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoEmoji}>☕</Text>
          </View>
          <Text style={styles.brandTitle}>Nexus Resto & Cafe</Text>
          <Text style={styles.brandSubtitle}>Self-Service QR Ordering System</Text>
        </View>

        {/* Card Entry Form */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View>
              <Text style={styles.cardHeaderTitle}>Selamat Datang!</Text>
              <Text style={styles.cardHeaderSub}>Pilih nomor meja Anda untuk mulai memesan</Text>
            </View>
          </View>

          {/* Status Indicator Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, styles.dotGreen]} />
              <Text style={styles.legendText}>Kosong</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, styles.dotRed]} />
              <Text style={styles.legendText}>Terisi / Aktif</Text>
            </View>
          </View>

          {/* Quick Table Buttons */}
          <Text style={styles.quickTableLabel}>PILIH MEJA TERSEDIA:</Text>
          <View style={styles.quickTableGrid}>
            {quickTables.map((t) => {
              const isOccupied = occupiedTables.includes(t);
              const isSelected = table === t;

              return (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.tableChip,
                    isOccupied && styles.tableChipOccupied,
                    isSelected && styles.tableChipActive,
                  ]}
                  onPress={() => setTable(t)}
                >
                  <View style={[styles.dot, isOccupied ? styles.dotRed : styles.dotGreen]} />
                  <Text
                    style={[
                      styles.tableChipText,
                      isOccupied && styles.tableChipTextOccupied,
                      isSelected && styles.tableChipTextActive,
                    ]}
                  >
                    {t.startsWith("VIP") ? t : `Meja ${t}`} {isOccupied ? "(Terisi)" : ""}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Warning Banner if Occupied Table is Selected */}
          {isSelectedOccupied && (
            <View style={styles.occupiedWarningBox}>
              <Text style={styles.occupiedWarningTitle}>⚠️ Meja {table} Sedang Terisi</Text>
              <Text style={styles.occupiedWarningSub}>
                Meja ini sedang memiliki pesanan aktif. Lanjutkan jika Anda duduk bersama rombongan di meja ini.
              </Text>
            </View>
          )}

          {/* Input Manual */}
          <Text style={styles.quickTableLabel}>ATAU KETIK NOMOR MEJA LAIN:</Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: 12"
            placeholderTextColor="#94a3b8"
            value={table}
            onChangeText={setTable}
            keyboardType="default"
          />

          <TouchableOpacity
            style={[styles.button, table.trim() === "" && styles.buttonDisabled]}
            onPress={() => handleStart()}
            disabled={table.trim() === ""}
          >
            <Text style={styles.buttonText}>
              {isSelectedOccupied ? "Lanjutkan Gabung Meja ➡️" : "Lihat Menu Dine In ➡️"}
            </Text>
          </TouchableOpacity>

          {/* Quick Takeaway Option */}
          <TouchableOpacity style={styles.takeawayBtn} onPress={handleStartTakeaway}>
            <Text style={styles.takeawayBtnText}>🛍️ Pesan Takeaway / Bawa Pulang</Text>
          </TouchableOpacity>
        </View>

        {/* Feature Highlights Footer */}
        <View style={styles.featureGrid}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🚀</Text>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Bebas Antri</Text>
              <Text style={styles.featureDesc}>Pesan & bayar langsung dari meja HP Anda</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🤖</Text>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Nexus AI Assistant</Text>
              <Text style={styles.featureDesc}>Tanya rekomendasi menu pedas/favorit</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>💳</Text>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>QRIS & Tunai</Text>
              <Text style={styles.featureDesc}>Mendukung pembayaran cashless & kasir</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    padding: 24,
    paddingTop: 64,
    paddingBottom: 40,
    alignItems: "center",
  },
  brandHeader: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#533afd",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#533afd",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  logoEmoji: {
    fontSize: 32,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: "300",
    color: "#0d253d",
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "300",
  },
  card: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    marginBottom: 24,
  },
  cardTitleRow: {
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0d253d",
    marginBottom: 4,
  },
  cardHeaderSub: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "300",
  },
  legendRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
    padding: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  dotGreen: {
    backgroundColor: "#10B981",
  },
  dotRed: {
    backgroundColor: "#ef4444",
  },
  quickTableLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 1,
    marginBottom: 10,
  },
  quickTableGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  tableChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  tableChipOccupied: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  tableChipActive: {
    backgroundColor: "#533afd",
    borderColor: "#533afd",
  },
  tableChipText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  tableChipTextOccupied: {
    color: "#b91c1c",
  },
  tableChipTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  occupiedWarningBox: {
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  occupiedWarningTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#c2410c",
    marginBottom: 2,
  },
  occupiedWarningSub: {
    fontSize: 12,
    color: "#9a3412",
    lineHeight: 16,
  },
  input: {
    width: "100%",
    height: 52,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 14,
    fontSize: 16,
    paddingHorizontal: 16,
    color: "#0d253d",
    marginBottom: 20,
  },
  button: {
    width: "100%",
    height: 54,
    backgroundColor: "#533afd",
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#533afd",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  buttonDisabled: {
    backgroundColor: "#cbd5e1",
    shadowOpacity: 0,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  takeawayBtn: {
    width: "100%",
    height: 52,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  takeawayBtnText: {
    color: "#047857",
    fontSize: 15,
    fontWeight: "700",
  },
  featureGrid: {
    width: "100%",
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 14,
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0d253d",
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: "#64748b",
  },
});
