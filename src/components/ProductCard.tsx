import { Star, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";
import type { Product } from "@/data/products";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      name: product.name,
      image: product.images[0],
      price: product.price,
      originalPrice: product.originalPrice,
      size: product.availableSizes[0],
      color: product.colors[0].hex,
      colorName: product.colors[0].name,
      quantity: 1,
    });
    toast.success("Added to cart!");
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.15 }}
      className={cn("group", className)}
    >
      <Link to={`/products/${product.id}`} className="block">
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/20 h-full flex flex-col">
          {/* Image - No padding here anymore */}
          <div className="relative aspect-[4/5] overflow-hidden bg-muted">
            <img
              src={product.images[0]}
              alt={`${product.name} - ${product.colors[0].name}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              width={400}
              height={500}
            />
            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1">
              {product.isNew && (
                <Badge className="bg-primary/90 text-primary-foreground text-[10px] px-2 py-0.5 backdrop-blur-sm border-none">NEW</Badge>
              )}
              {product.isSale && (
                <Badge className="bg-accent/90 text-accent-foreground text-[10px] px-2 py-0.5 backdrop-blur-sm border-none">SALE</Badge>
              )}
            </div>
          </div>

          {/* Info - Padding applied here to keep text away from edges */}
          <div className="p-4 flex-1 flex flex-col">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] text-muted-foreground font-body uppercase tracking-widest">{product.brand}</p>
                <div className="flex items-center gap-1">
                  <Star className="h-2.5 w-2.5 fill-accent text-accent" />
                  <span className="text-[10px] text-muted-foreground font-body">
                    {product.rating} <span className="text-[9px] opacity-70">({product.reviewCount})</span>
                  </span>
                </div>
              </div>
              <h3 className="text-sm font-semibold font-body line-clamp-2 group-hover:text-primary transition-colors min-h-[2.5rem]">{product.name}</h3>
              <div className="pt-1">
                {product.originalPrice > product.price ? (
                  <div className="flex flex-col md:flex-row md:items-center md:gap-2">
                    {/* MRP first on mobile */}
                    <span className="text-[11px] text-muted-foreground line-through font-body opacity-70">
                      ₹{product.originalPrice.toLocaleString()}
                    </span>

                    {/* Sale Price and % OFF on next line for mobile, inline for desktop */}
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

            {/* Add to Cart */}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4 text-xs h-9 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 bg-background hover:bg-primary hover:text-white border-primary/20 hover:border-primary shadow-sm"
              onClick={handleAddToCart}
            >
              <ShoppingBag className="h-3.5 w-3.5 mr-2" />
              Add to Cart
            </Button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
