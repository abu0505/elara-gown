import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { products, reviews as allReviews } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SizeGuideModal } from "@/components/SizeGuideModal";
import { ProductCard } from "@/components/ProductCard";
import { useCartStore } from "@/stores/cartStore";
import { useProductDetail } from "@/hooks/useProducts";
import { toast } from "sonner";
import { Star, Minus, Plus, ShoppingBag, Truck, ChevronLeft, ChevronRight, CheckCircle, RefreshCw, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const ProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { data: product, isLoading } = useProductDetail(productId);
  const addItem = useCartStore((s) => s.addItem);

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [currentImage, setCurrentImage] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);

  if (isLoading) {
    return (
      <div className="container py-20 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-20 text-center">
        <p className="text-lg font-heading mb-4">Product not found</p>
        <Button asChild><Link to="/products">Back to Shop</Link></Button>
      </div>
    );
  }

  const productReviews = allReviews.filter((r) => r.productId === product.id);
  const relatedProducts = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 8);

  const handleAddToCart = () => {
    if (!selectedSize) { toast.error("Please select a size"); return; }
    addItem({
      productId: product.id,
      name: product.name,
      image: product.images[0],
      price: product.price,
      originalPrice: product.originalPrice,
      size: selectedSize,
      color: product.colors[selectedColor].hex,
      colorName: product.colors[selectedColor].name,
      quantity,
    });
    toast.success("Added to cart!");
  };

  const handleBuyNow = () => {
    if (!selectedSize) { toast.error("Please select a size"); return; }
    handleAddToCart();
    navigate("/checkout");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <div className="container py-4 md:py-8">
        <nav className="text-xs text-muted-foreground mb-4 font-body">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span className="mx-1">/</span>
          <Link to="/products" className="hover:text-primary">Shop</Link>
          <span className="mx-1">/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-6 md:gap-10">
          {/* Image gallery */}
          <div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-muted mb-3">
              <img src={product.images[currentImage]} alt={`${product.name} - ${product.colors[selectedColor].name}`} className="w-full h-full object-cover" width={800} height={1000} />
              <button onClick={() => setCurrentImage((c) => (c - 1 + product.images.length) % product.images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center" aria-label="Previous image"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => setCurrentImage((c) => (c + 1) % product.images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center" aria-label="Next image"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {product.images.map((img, i) => (
                <button key={i} onClick={() => setCurrentImage(i)} className={cn("w-16 h-20 rounded overflow-hidden border-2 flex-shrink-0 transition-colors", i === currentImage ? "border-primary" : "border-border")}>
                  <img src={img} alt="" className="w-full h-full object-cover" width={64} height={80} />
                </button>
              ))}
            </div>
          </div>

          {/* Product info */}
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground font-body">{product.brand}</p>
              <h1 className="font-heading text-2xl md:text-3xl font-bold">{product.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={cn("h-4 w-4", s <= Math.round(product.rating) ? "fill-accent text-accent" : "text-border")} />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground font-body">{product.rating} ({product.reviewCount} reviews)</span>
              </div>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold font-body text-primary">₹{product.price.toLocaleString()}</span>
              {product.originalPrice > product.price && (
                <>
                  <span className="text-base text-muted-foreground line-through font-body">₹{product.originalPrice.toLocaleString()}</span>
                  <Badge className="bg-success text-success-foreground">{product.discountPercent}% OFF</Badge>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-body">Inclusive of all taxes</p>
            <p className="text-xs text-muted-foreground font-body flex items-center gap-1">
              <Truck className="h-3 w-3" /> Estimated delivery: 3–5 business days
            </p>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold font-body">Select Size</h3>
                <SizeGuideModal trigger={<button className="text-xs text-primary underline font-body">Size Guide</button>} />
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => {
                  const available = product.availableSizes.includes(s);
                  return (
                    <button key={s} disabled={!available} onClick={() => setSelectedSize(s)}
                      className={cn("h-10 w-12 rounded-lg border text-sm font-medium transition-all font-body", !available && "opacity-30 cursor-not-allowed line-through", selectedSize === s ? "bg-primary text-primary-foreground border-primary scale-105" : "border-border hover:border-primary")}>{s}</button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold font-body mb-2">Color: <span className="font-normal text-muted-foreground">{product.colors[selectedColor].name}</span></h3>
              <div className="flex gap-2">
                {product.colors.map((c, i) => (
                  <button key={i} onClick={() => setSelectedColor(i)} className={cn("h-8 w-8 rounded-full border-2 transition-all", i === selectedColor ? "border-primary ring-2 ring-primary/30 scale-110" : "border-border")} style={{ backgroundColor: c.hex }} aria-label={c.name} />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold font-body mb-2">Quantity</h3>
              <div className="flex items-center gap-3">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center" aria-label="Decrease"><Minus className="h-4 w-4" /></button>
                <span className="w-6 text-center font-medium font-body">{quantity}</span>
                <button onClick={() => setQuantity((q) => Math.min(10, q + 1))} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center" aria-label="Increase"><Plus className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="hidden md:flex gap-3">
              <Button variant="outline" className="flex-1 h-12" onClick={handleAddToCart}><ShoppingBag className="h-4 w-4 mr-2" /> Add to Cart</Button>
              <Button className="flex-1 h-12" onClick={handleBuyNow}>Buy Now</Button>
            </div>

            <Separator />

            <Accordion type="multiple" defaultValue={["details"]}>
              <AccordionItem value="details">
                <AccordionTrigger className="font-body text-sm font-semibold">Product Details</AccordionTrigger>
                <AccordionContent className="font-body text-sm text-muted-foreground space-y-2">
                  <p>{product.description}</p>
                  <p><strong>Material:</strong> {product.material}</p>
                  <p><strong>Fit:</strong> {product.fit}</p>
                  <p><strong>Occasion:</strong> {product.occasion}</p>
                  <p><strong>Care:</strong> {product.careInstructions}</p>
                  <p><strong>Country of Origin:</strong> India</p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="delivery">
                <AccordionTrigger className="font-body text-sm font-semibold">Delivery & Returns</AccordionTrigger>
                <AccordionContent className="font-body text-sm text-muted-foreground space-y-2">
                  <p className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-success flex-shrink-0" /> Free delivery on orders above ₹599</p>
                  <p className="flex items-center gap-2"><RefreshCw className="h-4 w-4 text-primary flex-shrink-0" /> 7-day easy returns</p>
                  <p className="flex items-center gap-2"><Banknote className="h-4 w-4 text-muted-foreground flex-shrink-0" /> Cash on Delivery available</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {productReviews.length > 0 && (
          <section className="mt-12">
            <h2 className="font-heading text-xl font-bold mb-6">Customer Reviews</h2>
            <div className="flex items-center gap-4 mb-6">
              <div className="text-center">
                <p className="text-4xl font-bold font-body">{product.rating}</p>
                <div className="flex gap-0.5 mt-1">{[1, 2, 3, 4, 5].map((s) => (<Star key={s} className={cn("h-4 w-4", s <= Math.round(product.rating) ? "fill-accent text-accent" : "text-border")} />))}</div>
                <p className="text-xs text-muted-foreground mt-1 font-body">{product.reviewCount} reviews</p>
              </div>
            </div>
            <div className="space-y-4">
              {(showAllReviews ? productReviews : productReviews.slice(0, 3)).map((r) => (
                <div key={r.id} className="p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary font-body">{r.name.charAt(0)}</div>
                      <div><p className="text-sm font-medium font-body">{r.name}</p>{r.verified && <Badge variant="secondary" className="text-[10px]">Verified Purchase</Badge>}</div>
                    </div>
                    <span className="text-xs text-muted-foreground font-body">{r.date}</span>
                  </div>
                  <div className="flex gap-0.5 mb-1">{[1, 2, 3, 4, 5].map((s) => (<Star key={s} className={cn("h-3 w-3", s <= r.rating ? "fill-accent text-accent" : "text-border")} />))}</div>
                  <p className="text-sm font-semibold font-body">{r.title}</p>
                  <p className="text-sm text-muted-foreground font-body">{r.body}</p>
                </div>
              ))}
            </div>
            {productReviews.length > 3 && !showAllReviews && (<Button variant="outline" className="mt-4" onClick={() => setShowAllReviews(true)}>Show More Reviews</Button>)}
          </section>
        )}

        {relatedProducts.length > 0 && (
          <section className="mt-12">
            <h2 className="font-heading text-xl font-bold mb-6">You May Also Like</h2>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 md:grid md:grid-cols-4 md:gap-6">
              {relatedProducts.map((p) => (<div key={p.id} className="min-w-[160px] md:min-w-0 snap-start"><ProductCard product={p} /></div>))}
            </div>
          </section>
        )}
      </div>

      <div className="fixed bottom-14 left-0 right-0 bg-background border-t border-border p-3 flex gap-2 md:hidden z-40">
        <Button variant="outline" className="flex-1 h-11" onClick={handleAddToCart}><ShoppingBag className="h-4 w-4 mr-1" /> Add to Cart</Button>
        <Button className="flex-1 h-11" onClick={handleBuyNow}>Buy Now</Button>
      </div>
    </motion.div>
  );
};

export default ProductDetail;
