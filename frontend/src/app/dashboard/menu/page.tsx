"use client";

import { useEffect, useState } from "react";
import { getMenus, createMenu, toggleMenuAvailability, deleteMenu } from "@/app/actions/menu";

export default function MenuManager() {
  const [menus, setMenus] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("food");
  const [price, setPrice] = useState("");
  const [stockQty, setStockQty] = useState("25");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    const data = await getMenus();
    setMenus(data);
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    await toggleMenuAvailability(id, !currentStatus);
    fetchMenus();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this menu item?")) {
      await deleteMenu(id);
      fetchMenus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;

    setSubmitting(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const parsedStock = parseInt(stockQty, 10) || 0;

      await createMenu({
        name,
        category,
        price: parseFloat(price) || 0,
        stock_qty: parsedStock,
        description,
        tags,
      });

      // Reset form & close modal
      setName("");
      setPrice("");
      setStockQty("25");
      setDescription("");
      setTagsInput("");
      setIsModalOpen(false);
      fetchMenus();
    } catch (err) {
      console.error("Failed to create menu:", err);
      alert("Failed to create menu item.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 font-sans">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light text-ink tracking-tight mb-2">Menu Manager</h1>
          <p className="text-[15px] text-ink-mute font-light">
            Manage your products, pricing, stock, and availability. Auto-syncs to AI & KDS.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white font-sans text-[15px] px-5 py-2.5 rounded-full hover:bg-primary-press transition-colors shadow-sm cursor-pointer"
        >
          + Add New Menu
        </button>
      </div>

      {/* Menu Table */}
      <div className="bg-white rounded-xl border border-hairline shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-hairline bg-canvas-soft">
              <th className="p-4 text-[13px] font-normal text-ink-mute uppercase tracking-widest">Item Name</th>
              <th className="p-4 text-[13px] font-normal text-ink-mute uppercase tracking-widest">Category</th>
              <th className="p-4 text-[13px] font-normal text-ink-mute uppercase tracking-widest text-right">Price</th>
              <th className="p-4 text-[13px] font-normal text-ink-mute uppercase tracking-widest text-center">Stock</th>
              <th className="p-4 text-[13px] font-normal text-ink-mute uppercase tracking-widest text-center">Status</th>
              <th className="p-4 text-[13px] font-normal text-ink-mute uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {menus.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-ink-mute font-light">
                  No menus found. Click &quot;+ Add New Menu&quot; to create your first item.
                </td>
              </tr>
            ) : (
              menus.map((menu) => {
                const stock = menu.stock_qty ?? 0;
                const isSoldOut = !menu.is_available || stock <= 0;

                return (
                  <tr key={menu.id} className="border-b border-hairline hover:bg-canvas-soft transition-colors">
                    <td className="p-4">
                      <div className="text-[15px] text-ink font-medium">{menu.name}</div>
                      <div className="text-[13px] text-ink-mute font-light">{menu.description || "-"}</div>
                      {menu.tags && menu.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {menu.tags.map((tag: string, idx: number) => (
                            <span key={idx} className="text-[10px] bg-canvas-soft border border-hairline text-ink-mute px-2 py-0.5 rounded-full">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-[15px] text-ink capitalize">{menu.category}</td>
                    <td className="p-4 text-right tabular-nums text-[15px] text-ink">
                      Rp {menu.price.toLocaleString("id-ID")}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`text-[12px] font-medium px-2.5 py-1 rounded-full ${
                          stock > 5
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : stock > 0
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {stock > 0 ? `${stock} porsi` : "Habis"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggle(menu.id, menu.is_available)}
                        className={`text-[11px] px-3 py-1 rounded-full cursor-pointer transition-colors ${
                          !isSoldOut ? "bg-primary-soft/20 text-primary-deep" : "bg-hairline text-ink-mute"
                        }`}
                      >
                        {!isSoldOut ? "Available" : "Sold Out"}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleDelete(menu.id)} className="text-[13px] text-ruby hover:underline cursor-pointer">
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Add Menu */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl border border-hairline">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-light text-ink">Add New Menu Item</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-ink-mute hover:text-ink text-xl cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[13px] text-ink-mute uppercase tracking-widest mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nasi Goreng Special"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-hairline rounded-lg text-[15px] text-ink focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[13px] text-ink-mute uppercase tracking-widest mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-hairline rounded-lg text-[14px] text-ink focus:outline-none focus:border-primary capitalize"
                  >
                    <option value="food">Food</option>
                    <option value="drink">Drink</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] text-ink-mute uppercase tracking-widest mb-1">
                    Price (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="25000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-hairline rounded-lg text-[14px] text-ink focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[13px] text-ink-mute uppercase tracking-widest mb-1">
                    Initial Stock *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="25"
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                    className="w-full px-3 py-2 border border-hairline rounded-lg text-[14px] text-ink focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] text-ink-mute uppercase tracking-widest mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description for AI vector embeddings and POS display..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-hairline rounded-lg text-[15px] text-ink focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[13px] text-ink-mute uppercase tracking-widest mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="pedas, populer, favorit"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-4 py-2 border border-hairline rounded-lg text-[15px] text-ink focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 rounded-full border border-hairline text-ink-mute hover:bg-canvas-soft text-[14px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded-full bg-primary text-white hover:bg-primary-press text-[14px] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Create Menu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
