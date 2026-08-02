"use client";

import { useEffect, useState } from "react";
import { getMenus, createMenu, toggleMenuAvailability, deleteMenu } from "@/app/actions/menu";
import { uploadImage } from "@/app/actions/upload";

function formatPriceInput(val: string): string {
  const digits = val.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10);
  return num.toLocaleString("id-ID");
}

function parsePriceValue(formattedVal: string): number {
  const digits = formattedVal.replace(/\D/g, "");
  return parseFloat(digits) || 0;
}

export default function MenuManager() {
  const [menus, setMenus] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("food");
  const [price, setPrice] = useState("");
  const [stockQty, setStockQty] = useState("25");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadImage(formData);
      if (res.error) {
        alert(`Upload error: ${res.error}`);
      } else {
        setImageUrl(res.url);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawPrice = parsePriceValue(price);
    if (!name || rawPrice <= 0) {
      alert("Mohon isi nama menu dan harga yang valid.");
      return;
    }

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
        price: rawPrice,
        stock_qty: parsedStock,
        image_url: imageUrl,
        description,
        tags,
      });

      // Reset form & close modal
      setName("");
      setPrice("");
      setStockQty("25");
      setImageUrl("");
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
    <div className="flex flex-col gap-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-ink tracking-tight mb-1">Menu Manager</h1>
          <p className="text-[14px] text-ink-mute font-light">
            Manage your products, pricing, stock, images, and availability. Auto-syncs to AI & KDS.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white font-sans text-[14px] px-5 py-2.5 rounded-full hover:bg-primary-press transition-colors shadow-xs cursor-pointer shrink-0"
        >
          + Add New Menu
        </button>
      </div>

      {/* Responsive Menu List / Table Wrapper */}
      <div className="bg-white rounded-2xl border border-hairline shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[768px]">
            <thead>
              <tr className="border-b border-hairline bg-canvas-soft">
                <th className="p-4 text-[12px] font-medium text-ink-mute uppercase tracking-wider w-16">Image</th>
                <th className="p-4 text-[12px] font-medium text-ink-mute uppercase tracking-wider">Item Details</th>
                <th className="p-4 text-[12px] font-medium text-ink-mute uppercase tracking-wider whitespace-nowrap">Category</th>
                <th className="p-4 text-[12px] font-medium text-ink-mute uppercase tracking-wider text-right whitespace-nowrap">Price</th>
                <th className="p-4 text-[12px] font-medium text-ink-mute uppercase tracking-wider text-center whitespace-nowrap">Stock</th>
                <th className="p-4 text-[12px] font-medium text-ink-mute uppercase tracking-wider text-center whitespace-nowrap">Status</th>
                <th className="p-4 text-[12px] font-medium text-ink-mute uppercase tracking-wider text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {menus.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-ink-mute font-light text-[14px]">
                    No menus found. Click &quot;+ Add New Menu&quot; to create your first item.
                  </td>
                </tr>
              ) : (
                menus.map((menu) => {
                  const stock = menu.stock_qty ?? 0;
                  const isSoldOut = !menu.is_available || stock <= 0;

                  return (
                    <tr key={menu.id} className="border-b border-hairline hover:bg-canvas-soft/50 transition-colors">
                      <td className="p-4 align-middle">
                        {menu.image_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={menu.image_url}
                            alt={menu.name}
                            className="w-14 h-14 rounded-xl object-cover border border-hairline bg-canvas-soft shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-canvas-soft border border-hairline flex items-center justify-center text-ink-mute text-lg shrink-0">
                            🍽️
                          </div>
                        )}
                      </td>
                      <td className="p-4 align-middle max-w-sm">
                        <div className="text-[15px] text-ink font-medium leading-snug">{menu.name}</div>
                        {menu.description ? (
                          <div className="text-[13px] text-ink-mute font-light mt-1 line-clamp-2 leading-relaxed">
                            {menu.description}
                          </div>
                        ) : null}
                        {menu.tags && menu.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {menu.tags.map((tag: string, idx: number) => (
                              <span key={idx} className="text-[11px] bg-canvas-soft border border-hairline text-ink-mute px-2.5 py-0.5 rounded-full font-light">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-4 align-middle text-[14px] text-ink capitalize whitespace-nowrap">
                        <span className="bg-canvas-soft px-3 py-1 rounded-lg border border-hairline">
                          {menu.category}
                        </span>
                      </td>
                      <td className="p-4 align-middle text-right tabular-nums text-[15px] text-ink font-medium whitespace-nowrap">
                        Rp {menu.price.toLocaleString("id-ID")}
                      </td>
                      <td className="p-4 align-middle text-center whitespace-nowrap">
                        <span
                          className={`inline-block text-[12px] font-medium px-3 py-1 rounded-full whitespace-nowrap ${
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
                      <td className="p-4 align-middle text-center whitespace-nowrap">
                        <button
                          onClick={() => handleToggle(menu.id, menu.is_available)}
                          className={`text-[12px] font-medium px-3.5 py-1 rounded-full cursor-pointer transition-colors whitespace-nowrap ${
                            !isSoldOut ? "bg-emerald-100/70 text-emerald-800 hover:bg-emerald-200" : "bg-hairline text-ink-mute hover:bg-hairline/80"
                          }`}
                        >
                          {!isSoldOut ? "Available" : "Sold Out"}
                        </button>
                      </td>
                      <td className="p-4 align-middle text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDelete(menu.id)}
                          className="text-[13px] text-ruby hover:text-ruby/80 font-medium cursor-pointer px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                        >
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
      </div>

      {/* Modal Add Menu */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl border border-hairline max-h-[90vh] overflow-y-auto">
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
                    type="text"
                    required
                    placeholder="25.000"
                    value={price}
                    onChange={(e) => setPrice(formatPriceInput(e.target.value))}
                    className="w-full px-3 py-2 border border-hairline rounded-lg text-[14px] text-ink focus:outline-none focus:border-primary font-medium"
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

              {/* Upload Foto Makanan File Input */}
              <div>
                <label className="block text-[13px] text-ink-mute uppercase tracking-widest mb-1">
                  Foto Makanan (JPG, PNG, WEBP)
                </label>
                <div className="flex items-center gap-4 border border-hairline p-3 rounded-lg bg-canvas-soft">
                  {imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-16 h-16 rounded-lg object-cover border border-hairline shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-white border border-hairline flex items-center justify-center text-ink-mute text-xl shrink-0">
                      📷
                    </div>
                  )}

                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                      disabled={uploadingImage}
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-block bg-white border border-hairline text-ink text-[13px] font-medium px-4 py-2 rounded-full cursor-pointer hover:bg-canvas transition-colors shadow-xs"
                    >
                      {uploadingImage ? "Uploading..." : imageUrl ? "Change Image" : "📁 Choose File (JPG/PNG)"}
                    </label>
                    {imageUrl && (
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="block text-[12px] text-ruby hover:underline mt-1 cursor-pointer"
                      >
                        Remove image
                      </button>
                    )}
                  </div>
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
                  disabled={submitting || uploadingImage}
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
