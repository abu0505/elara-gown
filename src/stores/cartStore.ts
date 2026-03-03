import { create } from 'zustand';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  price: number;
  originalPrice: number;
  size: string;
  color: string;
  colorName: string;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  couponCode: string | null;
  discount: number;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
  getDeliveryCharge: () => number;
  getDiscount: () => number;
  getTotal: () => number;
}

const COUPONS: Record<string, number> = {
  DRESS30: 30,
  FIRST10: 10,
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  couponCode: null,
  discount: 0,

  addItem: (item) => {
    const existing = get().items.find(
      (i) => i.productId === item.productId && i.size === item.size && i.color === item.color
    );
    if (existing) {
      set({
        items: get().items.map((i) =>
          i.id === existing.id ? { ...i, quantity: Math.min(i.quantity + item.quantity, 10) } : i
        ),
      });
    } else {
      set({ items: [...get().items, { ...item, id: `cart_${Date.now()}` }] });
    }
  },

  removeItem: (id) => set({ items: get().items.filter((i) => i.id !== id) }),

  updateQuantity: (id, quantity) => {
    if (quantity < 1) return get().removeItem(id);
    set({ items: get().items.map((i) => (i.id === id ? { ...i, quantity: Math.min(quantity, 10) } : i)) });
  },

  clearCart: () => set({ items: [], couponCode: null, discount: 0 }),

  applyCoupon: (code) => {
    const upper = code.toUpperCase();
    if (COUPONS[upper]) {
      set({ couponCode: upper, discount: COUPONS[upper] });
      return true;
    }
    return false;
  },

  removeCoupon: () => set({ couponCode: null, discount: 0 }),

  getTotalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  getSubtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

  getDeliveryCharge: () => (get().getSubtotal() >= 599 ? 0 : 49),

  getDiscount: () => {
    const { discount } = get();
    return discount > 0 ? Math.round(get().getSubtotal() * (discount / 100)) : 0;
  },

  getTotal: () => get().getSubtotal() + get().getDeliveryCharge() - get().getDiscount(),
}));
