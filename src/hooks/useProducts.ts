import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  categoryId: string | null;
  price: number;
  originalPrice: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  images: string[];
  imageColorMap: { url: string; colorHex: string | null }[];
  sizes: string[];
  availableSizes: string[];
  colors: { hex: string; name: string }[];
  isNew: boolean;
  isSale: boolean;
  isBestSeller: boolean;
  material: string;
  fit: string;
  occasion: string;
  description: string;
  careInstructions: string;
  inStock: boolean;
  stockCount: number;
  variants: { id: string; size: string; color_name: string; color_hex: string; stock_qty: number; is_active: boolean }[];
}

const PRODUCT_SELECT = `
  id, name, slug, base_price, sale_price, discount_percent,
  is_new_arrival, is_best_seller, is_featured, is_active,
  description, material, fit_type, occasion, care_instructions,
  category_id,
  category:categories(id, name, slug),
  images:product_images(id, public_url, is_primary, sort_order, color_hex),
  variants:product_variants(id, size, color_name, color_hex, stock_qty, is_active),
  reviews:reviews(rating)
`;

interface SupabaseProduct {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  sale_price: number | null;
  discount_percent: number | null;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  is_featured: boolean;
  is_active: boolean;
  description: string | null;
  material: string | null;
  fit_type: string | null;
  occasion: string[] | null;
  care_instructions: string | null;
  category_id: string | null;
  category: { id: string; name: string; slug: string } | null;
  images: { id: string; public_url: string; is_primary: boolean; sort_order: number; color_hex: string | null }[];
  variants: { id: string; size: string; color_name: string; color_hex: string; stock_qty: number; is_active: boolean }[];
  reviews: { rating: number }[];
}

function toStorefrontProduct(p: SupabaseProduct): Product {
  const sortedImages = [...(p.images || [])].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });

  const colors = Array.from(
    new Map((p.variants || []).filter(v => v.is_active).map(v => [v.color_name, { hex: v.color_hex, name: v.color_name }])).values()
  );

  const allSizes = ["XS", "S", "M", "L", "XL", "XXL", "Free Size"];
  const availableSizes = allSizes.filter(s =>
    (p.variants || []).some(v => v.size === s && v.is_active && v.stock_qty > 0)
  );
  const sizes = allSizes.filter(s =>
    (p.variants || []).some(v => v.size === s)
  );

  const totalStock = (p.variants || []).reduce((sum, v) => sum + v.stock_qty, 0);

  const approvedReviews = p.reviews || [];
  const reviewCount = approvedReviews.length;
  const avgRating = reviewCount > 0
    ? Math.round((approvedReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount) * 10) / 10
    : 0;

  return {
    id: p.id,
    name: p.name,
    brand: "Elara",
    category: p.category?.slug || "",
    categoryId: p.category_id,
    price: p.sale_price || p.base_price,
    originalPrice: p.base_price,
    discountPercent: p.discount_percent || 0,
    rating: avgRating,
    reviewCount,
    images: sortedImages.length > 0 ? sortedImages.map(i => i.public_url) : [],
    imageColorMap: sortedImages.map(i => ({ url: i.public_url, colorHex: i.color_hex })),
    sizes: sizes.length > 0 ? sizes : [],
    availableSizes: availableSizes.length > 0 ? availableSizes : [],
    colors: colors.length > 0 ? colors : [],
    isNew: p.is_new_arrival || false,
    isSale: (p.discount_percent || 0) > 0,
    isBestSeller: p.is_best_seller || false,
    material: p.material || "",
    fit: p.fit_type || "",
    occasion: (p.occasion || []).join(", "),
    description: p.description || "",
    careInstructions: p.care_instructions || "",
    inStock: totalStock > 0,
    stockCount: totalStock,
    variants: p.variants || [],
  };
}

export function useAllProducts() {
  return useQuery({
    queryKey: ["products", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) return [];
      return (data as unknown as SupabaseProduct[]).map(toStorefrontProduct);
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("is_active", true)
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(8);

      if (error || !data || data.length === 0) return [];
      return (data as unknown as SupabaseProduct[]).map(toStorefrontProduct);
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useNewArrivals() {
  return useQuery({
    queryKey: ["products", "new-arrivals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("is_active", true)
        .eq("is_new_arrival", true)
        .order("created_at", { ascending: false })
        .limit(8);

      if (error || !data || data.length === 0) return [];
      return (data as unknown as SupabaseProduct[]).map(toStorefrontProduct);
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useBestSellers() {
  return useQuery({
    queryKey: ["products", "best-sellers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("is_active", true)
        .eq("is_best_seller", true)
        .order("created_at", { ascending: false })
        .limit(8);

      if (error || !data || data.length === 0) return [];
      return (data as unknown as SupabaseProduct[]).map(toStorefrontProduct);
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useProductDetail(productId: string | undefined) {
  return useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      if (!productId) return null;

      let result;
      const { data: byId } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("id", productId)
        .eq("is_active", true)
        .single();

      if (byId) {
        result = byId;
      } else {
        const { data: bySlug } = await supabase
          .from("products")
          .select(PRODUCT_SELECT)
          .eq("slug", productId)
          .eq("is_active", true)
          .single();
        result = bySlug;
      }

      if (result) {
        return toStorefrontProduct(result as unknown as SupabaseProduct);
      }

      return null;
    },
    enabled: !!productId,
    staleTime: 1000 * 60 * 5,
  });
}

/** Lightweight hook: fetches only 6 random images for the lookbook strip */
export function useLookbookImages() {
  return useQuery({
    queryKey: ["lookbook-images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_images")
        .select("public_url, product_id")
        .eq("is_primary", true)
        .limit(12);

      if (error || !data || data.length === 0) return [];

      // Shuffle and take 6
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 6).map(img => ({
        src: img.public_url,
        link: `/products/${img.product_id}`,
      }));
    },
    staleTime: 1000 * 60 * 10,
  });
}

/** Fetches related products by category_id, excluding a specific product */
export function useRelatedProducts(categoryId: string | null | undefined, excludeId: string | undefined, limit = 8) {
  return useQuery({
    queryKey: ["products", "related", categoryId, excludeId],
    queryFn: async () => {
      if (!categoryId) return [];
      
      let query = supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("is_active", true)
        .eq("category_id", categoryId)
        .limit(limit);

      if (excludeId) {
        query = query.neq("id", excludeId);
      }

      const { data, error } = await query;
      if (error || !data || data.length === 0) return [];
      return (data as unknown as SupabaseProduct[]).map(toStorefrontProduct);
    },
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 5,
  });
}
