"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OrderItem = {
  menu_name: string;
  quantity: number;
  notes?: string;
};

type Order = {
  id: string;
  table_number: string;
  order_type?: string;
  status: "pending" | "preparing" | "ready" | "done" | "cancelled";
  items: OrderItem[];
  created_at: string;
};

export default function KDSPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    // 1. Fetch initial active orders directly from PostgreSQL Database via Go Core API
    const fetchActiveOrders = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
        const res = await fetch(`${apiUrl}/orders/active`);
        if (res.ok) {
          const data = await res.json();
          setOrders(data || []);
        }
      } catch (err) {
        console.warn("Could not fetch active orders from API:", err);
      }
    };

    fetchActiveOrders();

    // 2. Connect to Go Core WebSocket for realtime updates
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws/kds";
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => console.log("KDS connected to WebSocket");

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "init") {
        setOrders(data.payload || []);
      } else if (data.type === "new_order" || data.type === "update_order") {
        fetchActiveOrders(); // Re-sync active orders from DB
      }
    };

    setWs(socket);

    return () => socket.close();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    // Optimistic UI update
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: newStatus as any } : o)));

    // Kirim request ke backend via HTTP (backend akan broadcast via WS)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
    await fetch(`${apiUrl}/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  const columns = [
    { id: "pending", title: "New Orders", color: "border-t-primary", badgeBg: "bg-primary/10 text-primary" },
    { id: "preparing", title: "In Kitchen", color: "border-t-amber-500", badgeBg: "bg-amber-50 text-amber-700" },
    { id: "ready", title: "Ready for Pickup", color: "border-t-emerald-500", badgeBg: "bg-emerald-50 text-emerald-700" },
  ];

  return (
    <div className="h-screen bg-canvas-soft flex flex-col font-sans overflow-hidden">
      {/* KDS Header Bar */}
      <header className="bg-brand-dark text-white px-8 py-5 flex justify-between items-center shrink-0 shadow-md">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-white/70 hover:text-white transition-colors flex items-center gap-1 text-[14px] bg-white/10 px-4 py-2 rounded-full"
          >
            ← Back to Dashboard
          </Link>
          <div>
            <h1 className="text-2xl font-light text-white tracking-tight">Kitchen Display System (KDS)</h1>
            <p className="text-white/60 text-[13px] font-light">Realtime order dispatch & kitchen workflow</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-black/30 px-4 py-2 rounded-full border border-white/10">
          <div className={`w-3 h-3 rounded-full ${ws ? "bg-emerald-400" : "bg-ruby"} animate-pulse`} />
          <span className="text-[12px] text-white/90 uppercase tracking-widest font-medium">
            {ws ? "Live Connected" : "Disconnected"}
          </span>
        </div>
      </header>

      {/* Kanban Columns Layout */}
      <main className="flex-1 p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
        {columns.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.id);

          return (
            <div
              key={col.id}
              className={`bg-white rounded-2xl p-5 flex flex-col border-t-4 border border-hairline shadow-xs ${col.color} overflow-hidden`}
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-hairline shrink-0">
                <h2 className="text-lg font-normal text-ink">{col.title}</h2>
                <span className={`text-[12px] font-medium px-3 py-1 rounded-full ${col.badgeBg}`}>
                  {colOrders.length} orders
                </span>
              </div>

              {/* Scrollable Order Cards inside Column */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
                {colOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-ink-mute font-light text-[14px]">
                    No orders in {col.title.toLowerCase()}
                  </div>
                ) : (
                  colOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-canvas-soft rounded-xl p-5 border border-hairline shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <span className="bg-brand-dark text-white text-[15px] font-medium px-3 py-1 rounded-lg">
                            Table {order.table_number || "-"} ({order.order_type === "takeaway" ? "Takeaway" : "Dine In"})
                          </span>
                          <span className="text-[12px] text-ink-mute tabular-nums">
                            {new Date(order.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <ul className="mb-4 space-y-2">
                          {order.items?.map((item, idx) => (
                            <li key={idx} className="flex flex-col border-b border-hairline/60 pb-2">
                              <div className="flex justify-between text-[15px] text-ink font-medium">
                                <span>{item.menu_name}</span>
                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-[13px] font-semibold">
                                  x{item.quantity}
                                </span>
                              </div>
                              {item.notes ? (
                                <span className="text-[12px] text-primary-deep font-light italic mt-0.5">
                                  📝 {item.notes}
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-2">
                        {col.id === "pending" && (
                          <button
                            onClick={() => updateStatus(order.id, "preparing")}
                            className="w-full bg-primary text-white py-2.5 rounded-full text-[14px] font-medium hover:bg-primary-press transition-colors shadow-xs cursor-pointer"
                          >
                            🔥 Start Cooking
                          </button>
                        )}
                        {col.id === "preparing" && (
                          <button
                            onClick={() => updateStatus(order.id, "ready")}
                            className="w-full bg-emerald-600 text-white py-2.5 rounded-full text-[14px] font-medium hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                          >
                            🔔 Mark Ready for Pickup
                          </button>
                        )}
                        {col.id === "ready" && (
                          <button
                            onClick={() => updateStatus(order.id, "done")}
                            className="w-full bg-canvas border border-hairline text-ink py-2.5 rounded-full text-[14px] font-medium hover:bg-canvas-soft transition-colors cursor-pointer"
                          >
                            ✅ Complete Order
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
