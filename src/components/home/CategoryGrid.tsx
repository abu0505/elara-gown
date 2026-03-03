import { Link } from "react-router-dom";
import { categories } from "@/data/categories";
import { motion } from "framer-motion";

export function CategoryGrid() {
  return (
    <section className="container py-8 md:py-16">
      <h2 className="font-heading text-xl md:text-2xl font-bold text-center mb-6 md:mb-8">
        Shop by Category
      </h2>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4 md:gap-6">
        {categories.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              to={`/products?category=${cat.id}`}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden border-2 border-border group-hover:border-primary transition-colors group-hover:scale-105 transform duration-200">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  width={112}
                  height={112}
                />
              </div>
              <span className="text-xs md:text-sm font-medium text-center font-body">{cat.name}</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
