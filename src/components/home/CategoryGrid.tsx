import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

interface DBCategory {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  is_active: boolean;
}

export function CategoryGrid() {
  const { data: dbCategories } = useQuery({
    queryKey: ["categories", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, image_url, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error || !data || data.length === 0) return [];
      return data as DBCategory[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const categories = (dbCategories || []).map((c) => ({
    id: c.slug,
    name: c.name,
    image: c.image_url || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80&fit=crop&auto=format",
  }));

  if (categories.length === 0) return null;

  return (
    <section className="container py-8 md:py-16">
      <h2 className="font-heading text-xl md:text-2xl font-bold text-center mb-6 md:mb-8">
        Shop by Category
      </h2>
      <div className="grid grid-cols-3 md:flex md:grid-cols-6 gap-3 md:gap-6 justify-center items-start">
        {categories.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="flex flex-col items-center"
          >
            <Link
              to={`/products?category=${cat.id}`}
              className="flex flex-col items-center gap-2 group w-full"
            >
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-[2rem] overflow-hidden group-hover:scale-105 transform duration-300 shadow-md">
                {/* 1) The Actual Category Image */}
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  width={112}
                  height={112}
                />
                
                {/* 2) Ornate Decorative Frame SVG Overlay */}
                {/* This frame uses a mix of golden/bronze strokes with decorative corners resembling traditional styling */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-sm transition-opacity duration-300 group-hover:opacity-100 opacity-80"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  preserveAspectRatio="none"
                >
                  {/* Outer border */}
                  <rect x="2" y="2" width="96" height="96" rx="30" stroke="#C0A062" strokeWidth="1.5" />
                  
                  {/* Inner ornate border */}
                  <rect x="6" y="6" width="88" height="88" rx="26" stroke="#D4AF37" strokeWidth="0.75" strokeDasharray="3 2" />
                  
                  {/* Top-Left Corner Ornament */}
                  <path d="M 6 20 C 6 12, 12 6, 20 6 C 18 12, 12 18, 6 20 Z" fill="#D4AF37" opacity="0.8" />
                  <circle cx="12" cy="12" r="1.5" fill="#FFF" />
                  
                  {/* Top-Right Corner Ornament */}
                  <path d="M 94 20 C 94 12, 88 6, 80 6 C 82 12, 88 18, 94 20 Z" fill="#D4AF37" opacity="0.8" />
                  <circle cx="88" cy="12" r="1.5" fill="#FFF" />
                  
                  {/* Bottom-Left Corner Ornament */}
                  <path d="M 6 80 C 6 88, 12 94, 20 94 C 18 88, 12 82, 6 80 Z" fill="#D4AF37" opacity="0.8" />
                  <circle cx="12" cy="88" r="1.5" fill="#FFF" />
                  
                  {/* Bottom-Right Corner Ornament */}
                  <path d="M 94 80 C 94 88, 88 94, 80 94 C 82 88, 88 82, 94 80 Z" fill="#D4AF37" opacity="0.8" />
                  <circle cx="88" cy="88" r="1.5" fill="#FFF" />
                </svg>
              </div>
              <span className="text-xs md:text-sm font-medium text-center font-body break-words w-full px-1">{cat.name}</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
