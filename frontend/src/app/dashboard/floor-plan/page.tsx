"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TableStatus = "available" | "occupied" | "billed" | "reserved";

type TableData = {
  id: string;
  number: string;
  section: "Main Dining" | "Outdoor Terrace" | "VIP Lounge";
  capacity: number;
  status: TableStatus;
  orderId?: string;
  totalAmount?: number;
  guestCount?: number;
  occupiedSince?: string;
  version: number; // Optimistic Concurrency Control
};

const INITIAL_TABLES: TableData[] = [
  { id: "tbl-01", number: "T-01", section: "Main Dining", capacity: 4, status: "occupied", orderId: "ORD-98231", totalAmount: 145000, guestCount: 3, occupiedSince: "19:15", version: 1 },
  { id: "tbl-02", number: "T-02", section: "Main Dining", capacity: 2, status: "available", version: 1 },
  { id: "tbl-03", number: "T-03", section: "Main Dining", capacity: 4, status: "billed", orderId: "ORD-98240", totalAmount: 220000, guestCount: 4, occupiedSince: "18:40", version: 2 },
  { id: "tbl-04", number: "T-04", section: "Main Dining", capacity: 6, status: "reserved", guestCount: 6, occupiedSince: "20:00", version: 1 },
  { id: "tbl-05", number: "T-05", section: "Outdoor Terrace", capacity: 2, status: "available", version: 1 },
  { id: "tbl-06", number: "T-06", section: "Outdoor Terrace", capacity: 4, status: "occupied", orderId: "ORD-98245", totalAmount: 85000, guestCount: 2, occupiedSince: "19:40", version: 1 },
  { id: "tbl-07", number: "T-07", section: "Outdoor Terrace", capacity: 4, status: "available", version: 1 },
  { id: "tbl-08", number: "T-08", section: "VIP Lounge", capacity: 10, status: "occupied", orderId: "ORD-98210", totalAmount: 1250000, guestCount: 8, occupiedSince: "18:00", version: 3 },
];

export default function FloorPlanPage() {
  const [tables, setTables] = useState<TableData[]>(INITIAL_TABLES);
  const [selectedSection, setSelectedSection] = useState<string>("All");
  const [activeTable, setActiveTable] = useState<TableData | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Sync active orders from Go Core backend if available
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
        const res = await fetch(`${apiUrl}/orders/active`);
        if (res.ok) {
          const activeOrders = await res.json();
          if (Array.isArray(activeOrders) && activeOrders.length > 0) {
            setTables((prevTables) =>
              prevTables.map((tbl) => {
                const matchingOrder = activeOrders.find((o: any) => o.table_number === tbl.number);
                if (matchingOrder) {
                  return {
                    ...tbl,
                    status: matchingOrder.payment_status === "settled" ? "billed" : "occupied",
                    orderId: matchingOrder.id,
                    totalAmount: matchingOrder.total_amount,
                  };
                }
                return tbl;
              })
            );
          }
        }
      } catch (err) {
        console.warn("Could not sync live floor plan orders:", err);
      }
    };

    fetchOrders();
  }, []);

  const sections = ["All", "Main Dining", "Outdoor Terrace", "VIP Lounge"];

  const filteredTables = selectedSection === "All"
    ? tables
    : tables.filter((t) => t.section === selectedSection);

  // Handle Optimistic Concurrency Control table status update
  const handleUpdateStatus = (newStatus: TableStatus) => {
    if (!activeTable) return;

    // Optimistic Concurrency Control Check:
    // Cek apakah versi meja di local state cocok dengan expected version
    const currentTableInState = tables.find((t) => t.id === activeTable.id);
    if (currentTableInState && currentTableInState.version !== activeTable.version) {
      setConflictError(`CONCURRENCY CONFLICT: Status meja ${activeTable.number} telah diubah oleh staf lain di kasir terpisah! Silakan refresh.`);
      return;
    }

    setTables((prev) =>
      prev.map((t) => {
        if (t.id === activeTable.id) {
          return {
            ...t,
            status: newStatus,
            orderId: newStatus === "available" ? undefined : t.orderId,
            totalAmount: newStatus === "available" ? undefined : t.totalAmount,
            version: t.version + 1, // Increment version number
          };
        }
        return t;
      })
    );

    setActiveTable(null);
    setConflictError(null);
  };

  const getStatusStyle = (status: TableStatus) => {
    switch (status) {
      case "available":
        return { bg: "bg-emerald-50 text-emerald-800 border-emerald-300", badge: "bg-emerald-500 text-white", label: "Kosong" };
      case "occupied":
        return { bg: "bg-amber-50 text-amber-900 border-amber-300", badge: "bg-amber-500 text-white", label: "Terisi" };
      case "billed":
        return { bg: "bg-purple-50 text-purple-900 border-purple-300", badge: "bg-purple-600 text-white", label: "Menunggu Bayar" };
      case "reserved":
        return { bg: "bg-sky-50 text-sky-900 border-sky-300", badge: "bg-sky-500 text-white", label: "Direservasi" };
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-ink tracking-tight">Resto Floor Plan Visual Grid</h1>
          <p className="text-ink-mute text-sm mt-1">Realtime table occupancy & status manager with Optimistic Concurrency Control</p>
        </div>

        {/* Section Filter Chips */}
        <div className="flex flex-wrap gap-2">
          {sections.map((sec) => (
            <button
              key={sec}
              onClick={() => setSelectedSection(sec)}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                selectedSection === sec
                  ? "bg-brand-dark text-white shadow-xs"
                  : "bg-white text-ink-mute border border-hairline hover:bg-canvas-soft"
              }`}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* Legend Bar */}
      <div className="flex flex-wrap items-center gap-6 bg-white p-4 rounded-xl border border-hairline text-xs">
        <span className="font-semibold text-ink">Status Legend:</span>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Kosong (Available)</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500" /> Terisi (Occupied)</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-600" /> Menunggu Bayar (Billed)</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-sky-500" /> Direservasi (Reserved)</div>
      </div>

      {/* Floor Plan Visual Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredTables.map((tbl) => {
          const style = getStatusStyle(tbl.status);
          return (
            <div
              key={tbl.id}
              onClick={() => { setActiveTable(tbl); setConflictError(null); }}
              className={`rounded-2xl p-5 border-2 shadow-xs cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between h-48 ${style.bg}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-mute">{tbl.section}</span>
                  <h3 className="text-2xl font-bold text-ink mt-0.5">{tbl.number}</h3>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${style.badge}`}>
                  {style.label}
                </span>
              </div>

              <div className="space-y-1 text-xs my-2">
                <p className="text-ink-mute font-medium">Kapasitas: <span className="text-ink font-semibold">{tbl.capacity} Kursi</span></p>
                {tbl.guestCount && <p className="text-ink-mute">Tamu: <span className="text-ink font-semibold">{tbl.guestCount} Orang</span></p>}
                {tbl.occupiedSince && <p className="text-ink-mute">Terisi Sejak: <span className="text-ink font-semibold">{tbl.occupiedSince}</span></p>}
              </div>

              <div className="pt-3 border-t border-black/10 flex justify-between items-center text-xs">
                {tbl.totalAmount ? (
                  <span className="font-bold text-ink text-sm">Rp {tbl.totalAmount.toLocaleString("id-ID")}</span>
                ) : (
                  <span className="text-emerald-700 font-medium">Siap Digunakan</span>
                )}
                <span className="text-[10px] text-ink-mute bg-black/5 px-2 py-0.5 rounded">v{tbl.version}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table Action Modal with OCC Check */}
      {activeTable && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-hairline pb-4">
              <div>
                <h3 className="text-xl font-bold text-ink">Kelola Meja {activeTable.number}</h3>
                <p className="text-xs text-ink-mute">{activeTable.section} • Kapasitas {activeTable.capacity} Orang</p>
              </div>
              <button onClick={() => setActiveTable(null)} className="text-ink-mute hover:text-ink text-lg">✕</button>
            </div>

            {conflictError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg font-medium">
                ⚠️ {conflictError}
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs font-semibold text-ink">Ubah Status Meja (Version: {activeTable.version}):</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleUpdateStatus("available")}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2.5 px-4 rounded-xl text-xs transition-colors"
                >
                  🟢 Kosongkan (Vacate)
                </button>
                <button
                  onClick={() => handleUpdateStatus("occupied")}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-medium py-2.5 px-4 rounded-xl text-xs transition-colors"
                >
                  🟡 Set Terisi (Occupied)
                </button>
                <button
                  onClick={() => handleUpdateStatus("billed")}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-4 rounded-xl text-xs transition-colors"
                >
                  🟣 Set Billed (Bayar)
                </button>
                <button
                  onClick={() => handleUpdateStatus("reserved")}
                  className="bg-sky-500 hover:bg-sky-600 text-white font-medium py-2.5 px-4 rounded-xl text-xs transition-colors"
                >
                  🔵 Set Reservasi
                </button>
              </div>
            </div>

            {activeTable.orderId && (
              <div className="bg-canvas-soft p-4 rounded-xl text-xs space-y-1">
                <p className="font-semibold text-ink">Detail Pesanan Aktif:</p>
                <p className="text-ink-mute">Order ID: <span className="font-mono text-ink">{activeTable.orderId}</span></p>
                <p className="text-ink-mute">Total Tagihan: <span className="font-bold text-ink">Rp {activeTable.totalAmount?.toLocaleString("id-ID")}</span></p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
