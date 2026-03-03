import { create } from 'zustand';
import type { Product } from '@/data/products';

interface WishlistStore {
  items: Product[];
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: Product) => void;
}

export const useWishlistStore = create<WishlistStore>((set, get) => ({
  items: [],
  addToWishlist: (product) => {
    if (!get().isInWishlist(product.id)) {
      set({ items: [...get().items, product] });
    }
  },
  removeFromWishlist: (productId) =>
    set({ items: get().items.filter((p) => p.id !== productId) }),
  isInWishlist: (productId) => get().items.some((p) => p.id === productId),
  toggleWishlist: (product) => {
    if (get().isInWishlist(product.id)) {
      get().removeFromWishlist(product.id);
    } else {
      get().addToWishlist(product);
    }
  },
}));
