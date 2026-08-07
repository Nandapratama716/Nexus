/**
 * useThermalPrinter.ts — Phase 3.5: Thermal Printer Native Integration
 *
 * ARSITEKTUR:
 * Hook ini menyediakan abstraksi layer untuk:
 *   1. Bluetooth device discovery & pairing (Bluetooth Classic ESC/POS)
 *   2. Persistent pairing: alamat printer terakhir disimpan ke AsyncStorage
 *   3. Android 12+ Bluetooth Permission handling
 *   4. Graceful fallback ke modal preview jika printer tidak tersedia
 *
 * MENGAPA DIBUTUHKAN:
 * Tanpa layer abstraksi ini, logika Bluetooth tersebar di seluruh komponen dan
 * tidak bisa di-reuse. Hook ini memastikan:
 *   - Printer sekali di-pair, otomatis terhubung kembali di sesi berikutnya
 *   - Permission Android 12+ diminta secara benar (BLUETOOTH_SCAN + BLUETOOTH_CONNECT)
 *   - Jika bluetooth tidak ada / tidak connect, fallback ke preview teks aman
 *
 * DEPENDENCY (install jika belum ada):
 *   npx expo install react-native-bluetooth-classic @react-native-async-storage/async-storage
 *
 * CATATAN PLATFORM:
 *   - iOS: Gunakan External Accessory Framework (MFi) — tidak dicover hook ini
 *   - Android: Bluetooth Classic ESC/POS (via SPP Profile) — fully supported
 *   - Web (Expo Web): Tidak ada Bluetooth; fallback ke modal preview otomatis
 */

import { useState, useCallback } from "react";
import { Platform, Alert, PermissionsAndroid } from "react-native";

// Coba import paket native; jika tidak ada, semua operasi fallback ke preview
let RNBluetoothClassic: any = null;
let AsyncStorage: any = null;

try {
  RNBluetoothClassic = require("react-native-bluetooth-classic").default;
} catch {
  // Paket belum di-install — graceful fallback
}

try {
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
} catch {
  // Paket belum di-install — in-memory state saja
}

const STORAGE_KEY_LAST_PRINTER = "@nexus_last_printer_address";

export interface BluetoothDevice {
  address: string;
  name: string;
}

export interface UseThermalPrinterReturn {
  isAvailable: boolean;
  isConnected: boolean;
  connectedDevice: BluetoothDevice | null;
  pairedDevices: BluetoothDevice[];
  scanning: boolean;
  requestPermissions: () => Promise<boolean>;
  scanDevices: () => Promise<void>;
  connectDevice: (device: BluetoothDevice) => Promise<boolean>;
  disconnectDevice: () => Promise<void>;
  printText: (text: string) => Promise<{ success: boolean; fallback?: boolean }>;
}

export function useThermalPrinter(): UseThermalPrinterReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [pairedDevices, setPairedDevices] = useState<BluetoothDevice[]>([]);
  const [scanning, setScanning] = useState(false);

  const isAvailable = Platform.OS === "android" && RNBluetoothClassic !== null;

  /**
   * Android 12+: Request BLUETOOTH_SCAN + BLUETOOTH_CONNECT permissions
   * Di Android < 12, cukup BLUETOOTH dan BLUETOOTH_ADMIN (otomatis diberikan)
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== "android") return false;
    if (!RNBluetoothClassic) return false;

    try {
      if (Platform.Version >= 31) {
        // Android 12+ (API 31+): Runtime permission baru diperlukan
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);

        return (
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        // Android < 12: Hanya perlu lokasi untuk BT discovery
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Izin Bluetooth",
            message: "Nexus POS membutuhkan akses Bluetooth untuk menghubungkan printer thermal.",
            buttonNeutral: "Tanya Nanti",
            buttonNegative: "Batal",
            buttonPositive: "Izinkan",
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (err) {
      console.warn("[Thermal Printer] Permission request error:", err);
      return false;
    }
  }, []);

  /**
   * Scan perangkat Bluetooth paired (sudah pernah dipasangkan di sistem)
   * Kemudian coba auto-connect ke printer yang terakhir kali digunakan
   */
  const scanDevices = useCallback(async (): Promise<void> => {
    if (!RNBluetoothClassic) return;

    setScanning(true);
    try {
      const permOk = await requestPermissions();
      if (!permOk) {
        Alert.alert("Izin Bluetooth Ditolak", "Izin Bluetooth diperlukan untuk menghubungkan printer thermal.");
        return;
      }

      // Ambil semua perangkat Bluetooth yang sudah paired di sistem Android
      const bonded: any[] = await RNBluetoothClassic.getBondedDevices();
      const devices: BluetoothDevice[] = bonded.map((d: any) => ({
        address: d.address,
        name: d.name || "Unknown Device",
      }));
      setPairedDevices(devices);

      // Auto-reconnect ke printer terakhir dari AsyncStorage
      if (AsyncStorage) {
        const lastAddress = await AsyncStorage.getItem(STORAGE_KEY_LAST_PRINTER);
        if (lastAddress) {
          const lastDevice = devices.find((d) => d.address === lastAddress);
          if (lastDevice) {
            console.log(`[Thermal Printer] Auto-reconnecting to last printer: ${lastDevice.name}`);
            await connectDevice(lastDevice);
          }
        }
      }
    } catch (err) {
      console.warn("[Thermal Printer] Scan error:", err);
    } finally {
      setScanning(false);
    }
  }, [requestPermissions]);

  /**
   * Hubungkan ke printer Bluetooth dan simpan alamatnya ke AsyncStorage
   * untuk persistent pairing di sesi berikutnya
   */
  const connectDevice = useCallback(async (device: BluetoothDevice): Promise<boolean> => {
    if (!RNBluetoothClassic) return false;

    try {
      const connected = await RNBluetoothClassic.connectToDevice(device.address);
      if (connected) {
        setIsConnected(true);
        setConnectedDevice(device);

        // Simpan alamat printer untuk auto-reconnect di sesi berikutnya
        if (AsyncStorage) {
          await AsyncStorage.setItem(STORAGE_KEY_LAST_PRINTER, device.address);
        }

        console.log(`[Thermal Printer] Terhubung ke: ${device.name} (${device.address})`);
        return true;
      }
      return false;
    } catch (err) {
      console.error("[Thermal Printer] Connection error:", err);
      setIsConnected(false);
      return false;
    }
  }, []);

  /**
   * Putuskan koneksi dari printer
   */
  const disconnectDevice = useCallback(async (): Promise<void> => {
    if (!RNBluetoothClassic || !connectedDevice) return;

    try {
      await RNBluetoothClassic.disconnectFromDevice(connectedDevice.address);
    } finally {
      setIsConnected(false);
      setConnectedDevice(null);
    }
  }, [connectedDevice]);

  /**
   * Cetak teks ESC/POS ke printer Bluetooth.
   * Jika printer tidak tersedia / tidak terhubung, return { fallback: true }
   * agar UI menampilkan modal preview sebagai fallback.
   *
   * ESC/POS Command yang digunakan:
   *   \x1B\x40    → Initialize printer (reset)
   *   \x1B\x61\x01 → Center align text
   *   \x1D\x56\x42\x00 → Full cut paper
   */
  const printText = useCallback(async (text: string): Promise<{ success: boolean; fallback?: boolean }> => {
    if (!RNBluetoothClassic || !isConnected || !connectedDevice) {
      // Graceful fallback — tampilkan modal preview di UI
      return { success: false, fallback: true };
    }

    try {
      // ESC/POS Protocol: Initialize + Print Text + Full Cut
      const initCmd = "\x1B\x40";       // Init printer
      const cutCmd = "\x1D\x56\x42\x00"; // Full cut

      await RNBluetoothClassic.writeToDevice(
        connectedDevice.address,
        initCmd + text + cutCmd
      );

      console.log("[Thermal Printer] ✅ Struk berhasil dicetak!");
      return { success: true };
    } catch (err) {
      console.error("[Thermal Printer] Print error:", err);
      // Tandai disconnected jika gagal print (kemungkinan printer mati)
      setIsConnected(false);
      return { success: false, fallback: true };
    }
  }, [isConnected, connectedDevice]);

  return {
    isAvailable,
    isConnected,
    connectedDevice,
    pairedDevices,
    scanning,
    requestPermissions,
    scanDevices,
    connectDevice,
    disconnectDevice,
    printText,
  };
}
