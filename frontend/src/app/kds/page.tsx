"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OrderItem = {
  menu_name: string;
  quantity: number;
};

type Order = {
  id: string;
  table_number: string;
  status: "pending" | "preparing" | "ready" | "done" | "cancelled";
  items: OrderItem[];
  created_at: string;
};

export default function KDSPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Konek ke WebSocket backend Go
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws/kds";
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => console.log("KDS connected to WebSocket");
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "init") {
        setOrders(data.payload);
      } else if (data.type === "new_order" || data.type === "update_order") {
        setOrders((prev) => {
          const index = prev.findIndex((o) => o.id === data.payload.id);
          if (index >= 0) {
            const newOrders = [...prev];
            newOrders[index] = data.payload;
            return newOrders;
          }
          return [...prev, data.payload];
        });
      }
    };

    setWs(socket);

    return () => socket.close();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    // Optimistic UI update
    setOrders((prev) => prev.map(o => o.id === id ? { ...o, status: newStatus as any } : o));
    
    // Kirim request ke backend via HTTP (backend akan broadcast via WS)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
    await fetch(`${apiUrl}/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  const columns = [
    { id: "pending", title: "New Orders", color: "border-t-primary" },
    { id: "preparing", title: "In Kitchen", color: "border-t-lemon" },
    { id: "ready", title: "Ready for Pickup", color: "border-t-brand-dark" },
  ];

  return (
    <div className="min-h-screen bg-canvas p-8 font-sans">
      <header className="mb-8 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-ink-mute hover:text-ink transition-colors flex items-center gap-1 text-[14px]">
            ← Back
          </Link>
          <div>
            <h1 className="text-3xl font-light text-ink tracking-tight">Kitchen Display</h1>
            <p className="text-ink-mute text-[15px] font-light">Realtime order synchronization</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <div className={`w-3 h-3 rounded-full ${ws ? "bg-[#10B981]" : "bg-ruby"} animate-pulse`} />
          <span className="text-[13px] text-ink-mute uppercase tracking-widest">{ws ? "Live" : "Disconnected"}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
        {columns.map((col) => (
          <div key={col.id} className={`bg-canvas-soft rounded-xl p-4 flex flex-col gap-4 border-t-4 shadow-sm ${col.color}`}>
            <h2 className="text-xl font-light text-ink">{col.title} <span className="text-ink-mute text-[15px]">({orders.filter(o => o.status === col.id).length})</span></h2>
            
            <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-2">
              {orders.filter(o => o.status === col.id).map(order => (
                <div key={order.id} className="bg-white rounded-lg p-5 shadow-[0_1px_3px_rgba(0,55,112,0.08)] border border-hairline relative">
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-brand-dark text-white text-[18px] px-3 py-1 rounded-md">Table {order.table_number}</span>
                    <span className="text-[13px] text-ink-mute tabular-nums">{new Date(order.created_at).toLocaleTimeString()}</span>
                  </div>
                  
                  <ul className="mb-6 space-y-2">
                    {order.items?.map((item, idx) => (
                      <li key={idx} className="flex justify-between text-[15px] text-ink font-light border-b border-hairline/50 pb-2">
                        <span>{item.quantity}x {item.menu_name}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex gap-2 mt-auto">
                    {col.id === "pending" && (
                      <button onClick={() => updateStatus(order.id, "preparing")} className="w-full bg-primary text-white py-2 rounded-md text-[14px] hover:bg-primary-press transition-colors">
                        Start Preparing
                      </button>
                    )}
                    {col.id === "preparing" && (
                      <button onClick={() => updateStatus(order.id, "ready")} className="w-full bg-brand-dark text-white py-2 rounded-md text-[14px] hover:bg-brand-dark/90 transition-colors">
                        Mark Ready
                      </button>
                    )}
                    {col.id === "ready" && (
                      <button onClick={() => updateStatus(order.id, "done")} className="w-full bg-canvas-soft text-ink py-2 rounded-md border border-hairline text-[14px] hover:bg-hairline transition-colors">
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
