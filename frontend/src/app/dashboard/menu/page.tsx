"use client";

import { useEffect, useState } from "react";
import { getMenus, toggleMenuAvailability, deleteMenu } from "@/app/actions/menu";

export default function MenuManager() {
  const [menus, setMenus] = useState<any[]>([]);

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    const data = await getMenus();
    setMenus(data);
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    await toggleMenuAvailability(id, !currentStatus);
    fetchMenus(); // Optimistic update bisa ditambahkan nanti
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure?")) {
      await deleteMenu(id);
      fetchMenus();
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light text-ink tracking-tight mb-2">Menu Manager</h1>
          <p className="text-[15px] text-ink-mute font-light">Manage your products, pricing, and availability.</p>
        </div>
        <button className="bg-primary text-white font-sans text-[16px] px-4 py-2 rounded-full hover:bg-primary-press transition-colors shadow-sm">
          + Add Menu
        </button>
      </div>

      <div className="bg-white rounded-xl border border-hairline shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-hairline bg-canvas-soft">
              <th className="p-4 text-[13px] font-normal text-ink-mute uppercase tracking-widest">Item Name</th>
              <th className="p-4 text-[13px] font-normal text-ink-mute uppercase tracking-widest">Category</th>
              <th className="p-4 text-[13px] font-normal text-ink-mute uppercase tracking-widest text-right">Price</th>
              <th className="p-4 text-[13px] font-normal text-ink-mute uppercase tracking-widest text-center">Status</th>
              <th className="p-4 text-[13px] font-normal text-ink-mute uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {menus.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-ink-mute font-light">No menus found. Create one to get started.</td>
              </tr>
            ) : (
              menus.map((menu) => (
                <tr key={menu.id} className="border-b border-hairline hover:bg-canvas-soft transition-colors">
                  <td className="p-4">
                    <div className="text-[15px] text-ink">{menu.name}</div>
                    <div className="text-[13px] text-ink-mute">{menu.description}</div>
                  </td>
                  <td className="p-4 text-[15px] text-ink capitalize">{menu.category}</td>
                  <td className="p-4 text-right tabular-nums text-[15px] text-ink">
                    Rp {menu.price.toLocaleString("id-ID")}
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => handleToggle(menu.id, menu.is_available)}
                      className={`text-[11px] px-3 py-1 rounded-full ${
                        menu.is_available ? "bg-primary-soft/20 text-primary-deep" : "bg-hairline text-ink-mute"
                      }`}
                    >
                      {menu.is_available ? "Available" : "Sold Out"}
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleDelete(menu.id)} className="text-[13px] text-ruby hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
