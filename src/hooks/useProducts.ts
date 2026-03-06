import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { products as hardcodedProducts, getProductById as getHardcodedProduct, getNewArrivals, getBestSellers, type Product } from "@/data/products";

const PRODUCT_SELECT = `
  id, name, slug, base_price, sale_price, discount_percent,
  is_new_arrival, is_best_seller, is_featured, is_active,
  description, material, fit_type, occasion, care_instructions,
  category_id,
  category:categories(id, name, slug),
  images:product_images(id, public_url, is_primary, sort_order),
  variants:product_variants(id, size, color_name, color_hex, stock_qty, is_active)
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
  images: { id: string; public_url: string; is_primary: boolean; sort_order: number }[];
  variants: { id: string; size: string; color_name: string; color_hex: string; stock_qty: number; is_active: boolean }[];
}

// Convert Supabase product to the format used by ProductCard
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

  return {
    id: p.id,
    name: p.name,
    brand: "Elara",
    category: p.category?.slug || "",
    price: p.sale_price || p.base_price,
    originalPrice: p.base_price,
    discountPercent: p.discount_percent || 0,
    rating: 4.5,
    reviewCount: 0,
    images: sortedImages.length > 0 ? sortedImages.map(i => i.public_url) : ["https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80&fit=crop&auto=format"],
    sizes: sizes.length > 0 ? sizes : ["S", "M", "L", "XL"],
    availableSizes: availableSizes.length > 0 ? availableSizes : ["S", "M", "L"],
    colors: colors.length > 0 ? colors : [{ hex: "#000000", name: "Black" }],
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

      if (error || !data || data.length === 0) {
        return hardcodedProducts;
      }
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

      if (error || !data || data.length === 0) {
        return getBestSellers().slice(0, 8);
      }
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

      if (error || !data || data.length === 0) {
        return getNewArrivals().slice(0, 8);
      }
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

      if (error || !data || data.length === 0) {
        return getBestSellers().slice(0, 8);
      }
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

      // Try by ID first, then by slug
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

      // Fallback to hardcoded
      return getHardcodedProduct(productId) || null;
    },
    enabled: !!productId,
    staleTime: 1000 * 60 * 5,
  });
}
