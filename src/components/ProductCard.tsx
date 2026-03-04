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
        {/* Image */}
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-muted">
          <img
            src={product.images[0]}
            alt={`${product.name} - ${product.colors[0].name}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            width={400}
            height={500}
          />
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.isNew && (
              <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5">NEW</Badge>
            )}
            {product.isSale && (
              <Badge className="bg-accent text-accent-foreground text-[10px] px-2 py-0.5">SALE</Badge>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mt-2 space-y-1">
          <p className="text-xs text-muted-foreground font-body">{product.brand}</p>
          <h3 className="text-sm font-medium font-body line-clamp-1">{product.name}</h3>
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-accent text-accent" />
            <span className="text-xs text-muted-foreground font-body">
              {product.rating} ({product.reviewCount})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold font-body">₹{product.price.toLocaleString()}</span>
            {product.originalPrice > product.price && (
              <>
                <span className="text-xs text-muted-foreground line-through font-body">
                  ₹{product.originalPrice.toLocaleString()}
                </span>
                <span className="text-xs text-success font-medium font-body">
                  {product.discountPercent}% OFF
                </span>
              </>
            )}
          </div>
        </div>

        {/* Add to Cart */}
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2 text-xs h-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          onClick={handleAddToCart}
        >
          <ShoppingBag className="h-3 w-3 mr-1" />
          Add to Cart
        </Button>
      </Link>
    </motion.div>
  );
}
