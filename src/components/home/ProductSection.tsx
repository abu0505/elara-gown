import { Link } from "react-router-dom";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/data/products";

interface ProductSectionProps {
  title: string;
  products: Product[];
  viewAllLink?: string;
}

export function ProductSection({ title, products, viewAllLink }: ProductSectionProps) {
  if (!products || products.length === 0) return null;

  return (
    <section className="container py-8 md:py-16">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-xl md:text-2xl font-bold">{title}</h2>
        {viewAllLink && (
          <Link to={viewAllLink} className="text-sm text-primary font-medium hover:underline font-body">
            View All →
          </Link>
        )}
      </div>

      {/* Mobile: horizontal scroll */}
      <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 md:hidden">
        {products.map((p) => (
          <div key={p.id} className="min-w-[160px] max-w-[160px] snap-start">
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      {/* Desktop: grid */}
      <div className="hidden md:grid grid-cols-4 gap-6">
        {products.slice(0, 8).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
