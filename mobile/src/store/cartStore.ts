import { create } from "zustand";

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  category: string;
}

export interface CartItem {
  menu: MenuItem;
  quantity: number;
  notes: string; // catatan per-item: "pedas level 3, tanpa bawang"
}

interface CartState {
  items: CartItem[];
  tableNumber: string;
  orderType: "dine_in" | "takeaway";
  setTableNumber: (table: string) => void;
  setOrderType: (type: "dine_in" | "takeaway") => void;
  addItem: (menu: MenuItem) => void;
  removeItem: (menuId: string) => void;
  setItemNotes: (menuId: string, notes: string) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  tableNumber: "",
  orderType: "dine_in",
  setTableNumber: (table) => set({ tableNumber: table }),
  setOrderType: (type) => set({ orderType: type }),

  addItem: (menu) => {
    const { items } = get();
    const existingItem = items.find((item) => item.menu.id === menu.id);

    if (existingItem) {
      set({
        items: items.map((item) =>
          item.menu.id === menu.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
      });
    } else {
      set({ items: [...items, { menu, quantity: 1, notes: "" }] });
    }
  },

  removeItem: (menuId) => {
    const { items } = get();
    const existingItem = items.find((item) => item.menu.id === menuId);

    if (existingItem && existingItem.quantity > 1) {
      set({
        items: items.map((item) =>
          item.menu.id === menuId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        ),
      });
    } else {
      set({
        items: items.filter((item) => item.menu.id !== menuId),
      });
    }
  },

  setItemNotes: (menuId, notes) => {
    set({
      items: get().items.map((item) =>
        item.menu.id === menuId ? { ...item, notes } : item
      ),
    });
  },

  clearCart: () => set({ items: [], tableNumber: "", orderType: "dine_in" }),

  getTotal: () => {
    return get().items.reduce((total, item) => total + item.menu.price * item.quantity, 0);
  },
}));
