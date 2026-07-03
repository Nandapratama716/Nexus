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
}

interface CartState {
  items: CartItem[];
  tableNumber: string;
  setTableNumber: (table: string) => void;
  addItem: (menu: MenuItem) => void;
  removeItem: (menuId: string) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  tableNumber: "",
  setTableNumber: (table) => set({ tableNumber: table }),
  
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
      set({ items: [...items, { menu, quantity: 1 }] });
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

  clearCart: () => set({ items: [], tableNumber: "" }),

  getTotal: () => {
    return get().items.reduce((total, item) => total + item.menu.price * item.quantity, 0);
  },
}));
