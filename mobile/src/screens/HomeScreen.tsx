import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useCartStore } from "../store/cartStore";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RootStackParamList = {
  Home: undefined;
  Menu: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Home">;

export default function HomeScreen() {
  const [table, setTable] = useState("");
  const navigation = useNavigation<NavigationProp>();
  const setTableNumber = useCartStore((state) => state.setTableNumber);

  const handleStart = () => {
    if (table.trim() === "") return;
    setTableNumber(table.trim());
    navigation.navigate("Menu");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Nexus POS</Text>
        <Text style={styles.subtitle}>Enter table number to start order</Text>

        <TextInput
          style={styles.input}
          placeholder="Table No (e.g. 12)"
          placeholderTextColor="#94a3b8"
          value={table}
          onChangeText={setTable}
          keyboardType="numeric"
          maxLength={3}
        />

        <TouchableOpacity
          style={[styles.button, table.trim() === "" && styles.buttonDisabled]}
          onPress={handleStart}
          disabled={table.trim() === ""}
        >
          <Text style={styles.buttonText}>Start Order</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fcfcfc", // canvas color
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 42,
    fontWeight: "300",
    color: "#0d253d", // ink
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b", // ink-mute
    marginBottom: 48,
    fontWeight: "300",
  },
  input: {
    width: "100%",
    height: 64,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0", // hairline
    borderRadius: 16,
    fontSize: 24,
    textAlign: "center",
    color: "#0d253d",
    marginBottom: 24,
  },
  button: {
    width: "100%",
    height: 56,
    backgroundColor: "#533afd", // primary
    borderRadius: 100, // pill
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#94a3b8",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "500",
  },
});
