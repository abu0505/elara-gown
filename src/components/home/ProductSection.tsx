import { Link } from "react-router-dom";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/hooks/useProducts";

interface ProductSectionProps {
  title: string;
  products: Product[];
  viewAllLink?: string;
}

function ScrollableRow({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <div className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2">
      {products.map((p) => (
        <div key={p.id} className="min-w-[200px] max-w-[200px] md:min-w-[280px] md:max-w-[280px] snap-start flex-shrink-0">
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  );
}

export function ProductSection({ title, products, viewAllLink }: ProductSectionProps) {
  if (!products || products.length === 0) return null;

  const evenProducts = products.filter((_, i) => i % 2 === 0);
  const oddProducts = products.filter((_, i) => i % 2 !== 0);

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

      <div className="flex flex-col gap-4">
        <ScrollableRow products={evenProducts} />
        <ScrollableRow products={oddProducts} />
      </div>
    </section>
  );
}
