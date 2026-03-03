export interface Category {
  id: string;
  name: string;
  image: string;
  productCount: number;
}

export const categories: Category[] = [
  { id: "casual", name: "Casual Wear", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80&fit=crop&auto=format", productCount: 42 },
  { id: "party", name: "Party & Evening", image: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80&fit=crop&auto=format", productCount: 28 },
  { id: "formal", name: "Formal Wear", image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&q=80&fit=crop&auto=format", productCount: 19 },
  { id: "ethnic", name: "Ethnic & Traditional", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400&q=80&fit=crop&auto=format", productCount: 35 },
  { id: "western", name: "Western Wear", image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&q=80&fit=crop&auto=format", productCount: 31 },
  { id: "sale", name: "Sale", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80&fit=crop&auto=format", productCount: 56 },
];
