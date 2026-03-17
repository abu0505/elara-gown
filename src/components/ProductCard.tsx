import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/ui/StarRating";
import type { Product } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  return (
    <div className={cn("group transition-transform duration-150 hover:-translate-y-1", className)}>
      <Link to={`/products/${product.id}`} className="block">
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/20 h-full flex flex-col">
          <div className="relative aspect-[4/5] overflow-hidden bg-muted">
            {product.images[0] ? (
              <img
                src={product.images[0]}
                alt={`${product.name}${product.colors[0] ? ` - ${product.colors[0].name}` : ""}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                width={400}
                height={500}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No Image</div>
            )}
            <div className="absolute top-3 left-3 flex flex-col gap-1">
              {product.isNew && (
                <Badge className="bg-primary/90 text-primary-foreground text-[10px] px-2 py-0.5 backdrop-blur-sm border-none">NEW</Badge>
              )}
              {product.isSale && (
                <Badge className="bg-accent/90 text-accent-foreground text-[10px] px-2 py-0.5 backdrop-blur-sm border-none">SALE</Badge>
              )}
            </div>
          </div>

          <div className="p-4 flex-1 flex flex-col">
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-muted-foreground font-body uppercase tracking-widest">{product.brand}</p>
                  {product.reviewCount > 0 && (
                    <div className="flex items-center gap-1">
                      <StarRating rating={product.rating} size="sm" />
                      <span className="text-[10px] text-muted-foreground font-body">
                        {product.rating} <span className="text-[9px] opacity-70">({product.reviewCount})</span>
                      </span>
                    </div>
                  )}
                </div>

                {product.colors && product.colors.length > 0 && (
                  <div className="flex items-center">
                    <div className="flex -space-x-1.5 mr-1.5">
                      {product.colors.slice(0, 3).map((color, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded-full border border-black/10 shadow-sm"
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        />
                      ))}
                    </div>
                    {product.colors.length > 3 && (
                      <span className="text-[10px] text-muted-foreground font-medium">
                        +{product.colors.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <h3 className="text-sm font-semibold font-body line-clamp-2 group-hover:text-primary transition-colors min-h-[2.5rem]">{product.name}</h3>
              {product.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{product.description}</p>
              )}
              <div className="pt-1">
                {product.originalPrice > product.price ? (
                  <div className="flex flex-col md:flex-row md:items-center md:gap-2">
                    <span className="text-[11px] text-muted-foreground line-through font-body opacity-70">
                      ₹{product.originalPrice.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-body text-foreground">
                        ₹{product.price.toLocaleString()}
                      </span>
                      <Badge variant="outline" className="text-[9px] text-success border-success/30 bg-success/5 font-bold h-4 px-1 shrink-0">
                        {product.discountPercent}% OFF
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <span className="text-sm font-bold font-body text-foreground">
                    ₹{product.price.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
