import { create } from 'zustand';

export type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'rating';

interface FilterStore {
  category: string[];
  priceRange: [number, number];
  sizes: string[];
  colors: string[];
  discountMin: number;
  sortBy: SortOption;
  searchQuery: string;
  setCategory: (cats: string[]) => void;
  toggleCategory: (cat: string) => void;
  setPriceRange: (range: [number, number]) => void;
  toggleSize: (size: string) => void;
  toggleColor: (color: string) => void;
  setDiscountMin: (min: number) => void;
  setSortBy: (sort: SortOption) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;
  getActiveFilterCount: () => number;
}

export const useFilterStore = create<FilterStore>((set, get) => ({
  category: [],
  priceRange: [0, 5000],
  sizes: [],
  colors: [],
  discountMin: 0,
  sortBy: 'newest',
  searchQuery: '',

  setCategory: (cats) => set({ category: cats }),
  toggleCategory: (cat) => {
    const current = get().category;
    set({ category: current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat] });
  },
  setPriceRange: (range) => set({ priceRange: range }),
  toggleSize: (size) => {
    const current = get().sizes;
    set({ sizes: current.includes(size) ? current.filter((s) => s !== size) : [...current, size] });
  },
  toggleColor: (color) => {
    const current = get().colors;
    set({ colors: current.includes(color) ? current.filter((c) => c !== color) : [...current, color] });
  },
  setDiscountMin: (min) => set({ discountMin: min }),
  setSortBy: (sort) => set({ sortBy: sort }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  clearFilters: () =>
    set({ category: [], priceRange: [0, 5000], sizes: [], colors: [], discountMin: 0, sortBy: 'newest', searchQuery: '' }),
  getActiveFilterCount: () => {
    const s = get();
    let count = s.category.length + s.sizes.length + s.colors.length;
    if (s.priceRange[0] > 0 || s.priceRange[1] < 5000) count++;
    if (s.discountMin > 0) count++;
    return count;
  },
}));
