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
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-2 border-border group-hover:border-primary transition-colors group-hover:scale-105 transform duration-200">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  width={112}
                  height={112}
                />
              </div>
              <span className="text-xs md:text-sm font-medium text-center font-body break-words w-full px-1">{cat.name}</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
