import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

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
  variantId?: string;
}

interface CouponApplied {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  maxCap: number | null;
}

interface CartStore {
  items: CartItem[];
  couponCode: string | null;
  couponApplied: CouponApplied | null;
  couponLoading: boolean;
  couponError: string | null;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
  getDeliveryCharge: () => number;
  getDiscount: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  couponCode: null,
  couponApplied: null,
  couponLoading: false,
  couponError: null,

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

  clearCart: () => set({ items: [], couponCode: null, couponApplied: null, couponLoading: false, couponError: null }),

  applyCoupon: async (code: string) => {
    set({ couponLoading: true, couponError: null });
    try {
      const { data, error } = await supabase.functions.invoke('validate-coupon', {
        body: {
          code: code.trim().toUpperCase(),
          order_amount: get().getSubtotal(),
        },
      });

      if (error) {
        set({ couponLoading: false, couponError: 'Failed to validate coupon' });
        return false;
      }

      if (!data.valid) {
        set({ couponLoading: false, couponError: data.message || 'Invalid coupon', couponApplied: null, couponCode: null });
        return false;
      }

      set({
        couponLoading: false,
        couponError: null,
        couponCode: code.trim().toUpperCase(),
        couponApplied: {
          id: data.couponId,
          code: code.trim().toUpperCase(),
          discountType: data.discountType,
          discountValue: data.discountValue,
          discountAmount: data.discountAmount,
          maxCap: data.maxCap,
        },
      });
      return true;
    } catch {
      set({ couponLoading: false, couponError: 'Failed to validate coupon' });
      return false;
    }
  },

  removeCoupon: () => set({ couponCode: null, couponApplied: null, couponError: null }),

  getTotalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  getSubtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

  getDeliveryCharge: () => {
    const subtotal = get().getSubtotal();
    const discount = get().getDiscount();
    return (subtotal - discount) >= 599 ? 0 : 49;
  },

  getDiscount: () => {
    const { couponApplied } = get();
    if (!couponApplied) return 0;
    // Recalculate based on current subtotal
    const subtotal = get().items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    if (couponApplied.discountType === 'flat') {
      return Math.min(couponApplied.discountValue, subtotal);
    }
    let discount = (subtotal * couponApplied.discountValue) / 100;
    if (couponApplied.maxCap) discount = Math.min(discount, couponApplied.maxCap);
    return Math.round(discount);
  },

  getTotal: () => get().getSubtotal() + get().getDeliveryCharge() - get().getDiscount(),
}));
