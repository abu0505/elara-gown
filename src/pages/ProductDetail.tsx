import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SizeGuideModal } from "@/components/SizeGuideModal";
import { ProductCard } from "@/components/ProductCard";
import { StarRating } from "@/components/ui/StarRating";
import { useCartStore } from "@/stores/cartStore";
import { useProductDetail, useAllProducts } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Minus, Plus, ShoppingBag, Truck, ChevronLeft, ChevronRight, CheckCircle, RefreshCw, Banknote, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const ProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { data: product, isLoading } = useProductDetail(productId);
  const { data: allProducts } = useAllProducts();
  const addItem = useCartStore((s) => s.addItem);

  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [currentImage, setCurrentImage] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);

  // Review form state
  const [reviewName, setReviewName] = useState("");
  const [reviewEmail, setReviewEmail] = useState("");
  const [reviewOrderNumber, setReviewOrderNumber] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Reviews data
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);

  // Load reviews when product is available
  useMemo(() => {
    if (product?.id && !reviewsLoaded) {
      supabase
        .from("reviews")
        .select("*")
        .eq("product_id", product.id)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          setReviews(data || []);
          setReviewsLoaded(true);
        });
    }
  }, [product?.id, reviewsLoaded]);

  // Set initial color when product loads
  useMemo(() => {
    if (product && product.colors.length > 0 && !selectedColor) {
      setSelectedColor(product.colors[0].hex);
    }
  }, [product, selectedColor]);

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

  // Color-based image filtering
  const filteredImages = product.imageColorMap.length > 0
    ? (() => {
      const colorImages = product.imageColorMap.filter(img => img.colorHex === selectedColor);
      const neutralImages = product.imageColorMap.filter(img => !img.colorHex);
      const result = colorImages.length > 0 ? [...colorImages, ...neutralImages] : product.imageColorMap;
      return result.map(img => img.url);
    })()
    : product.images;

  // Available sizes for selected color
  const colorSizes = product.variants
    .filter(v => v.color_hex === selectedColor && v.is_active && v.stock_qty > 0)
    .map(v => v.size);

  const allVariantSizes = product.variants
    .filter(v => v.color_hex === selectedColor)
    .map(v => v.size);

  const currentColorObj = product.colors.find(c => c.hex === selectedColor);

  // Find the specific variant for cart
  const selectedVariant = product.variants.find(
    v => v.color_hex === selectedColor && v.size === selectedSize && v.is_active
  );

  const relatedProducts = (allProducts || []).filter(
    (p) => p.category === product.category && p.id !== product.id
  ).slice(0, 8);

  const handleColorChange = (hex: string) => {
    setSelectedColor(hex);
    setSelectedSize("");
    setQuantity(1);
    setCurrentImage(0);
  };

  const handleAddToCart = () => {
    if (!selectedSize) { toast.error("Please select a size"); return; }
    if (!currentColorObj) { toast.error("Please select a color"); return; }
    addItem({
      productId: product.id,
      name: product.name,
      image: filteredImages[0] || product.images[0] || "",
      price: product.price,
      originalPrice: product.originalPrice,
      size: selectedSize,
      color: selectedColor,
      colorName: currentColorObj.name,
      quantity: quantity,
      variantId: selectedVariant?.id,
    });
    toast.success("Added to cart!");
  };

  const handleBuyNow = () => {
    if (!selectedSize) { toast.error("Please select a size"); return; }
    handleAddToCart();
    navigate("/checkout");
  };

  // Review stats
  const reviewCount = reviews.length;
  const avgRating = reviewCount > 0
    ? Math.round((reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewCount) * 10) / 10
    : 0;
  const ratingBreakdown = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter((r: any) => r.rating === star).length,
    percent: reviewCount > 0 ? Math.round((reviews.filter((r: any) => r.rating === star).length / reviewCount) * 100) : 0,
  }));

  const handleSubmitReview = async () => {
    if (!reviewName.trim()) { toast.error("Please enter your name"); return; }
    if (reviewRating === 0) { toast.error("Please select a rating"); return; }
    if (!reviewBody.trim()) { toast.error("Please write your review"); return; }

    setSubmittingReview(true);

    // Check verified purchase if order number provided
    let isVerified = false;
    if (reviewOrderNumber.trim()) {
      const { data: orderData } = await supabase
        .from("orders")
        .select("id, order_items(product_id)")
        .eq("order_number", reviewOrderNumber.trim().toUpperCase())
        .single();

      if (orderData) {
        const orderItems = orderData.order_items as any[];
        isVerified = orderItems?.some((item: any) => item.product_id === product.id) || false;
      }
    }

    const { error } = await supabase.from("reviews").insert({
      product_id: product.id,
      customer_name: reviewName.trim(),
      customer_email: reviewEmail.trim() || null,
      order_number: reviewOrderNumber.trim() || null,
      rating: reviewRating,
      title: reviewTitle.trim() || null,
      body: reviewBody.trim(),
      is_verified: isVerified,
      is_approved: true,
    });

    setSubmittingReview(false);

    if (error) {
      toast.error("Failed to submit review");
      return;
    }

    toast.success(isVerified ? "Verified review submitted!" : "Review submitted!");
    setReviewName(""); setReviewEmail(""); setReviewOrderNumber("");
    setReviewRating(0); setReviewTitle(""); setReviewBody("");
    setReviewsLoaded(false); // Refresh reviews
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
          <div className="overflow-hidden min-w-0">
            <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-muted mb-3">
              {filteredImages[currentImage] ? (
                <img src={filteredImages[currentImage]} alt={`${product.name}${currentColorObj ? ` - ${currentColorObj.name}` : ""}`} className="w-full h-full object-cover" width={800} height={1000} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Image</div>
              )}
              {filteredImages.length > 1 && (
                <>
                  <button onClick={() => setCurrentImage((c) => (c - 1 + filteredImages.length) % filteredImages.length)} className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center" aria-label="Previous image"><ChevronLeft className="h-4 w-4" /></button>
                  <button onClick={() => setCurrentImage((c) => (c + 1) % filteredImages.length)} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center" aria-label="Next image"><ChevronRight className="h-4 w-4" /></button>
                </>
              )}
            </div>
            {filteredImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {filteredImages.map((img, i) => (
                  <button key={i} onClick={() => setCurrentImage(i)} className={cn("w-16 h-20 rounded overflow-hidden border-2 flex-shrink-0 transition-colors", i === currentImage ? "border-primary" : "border-border")}>
                    <img src={img} alt="" className="w-full h-full object-cover" width={64} height={80} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-muted-foreground font-body">{product.brand}</p>
                {reviewCount > 0 && (
                  <div className="flex items-center gap-2">
                    <StarRating rating={avgRating} size="sm" />
                    <span className="text-sm text-muted-foreground font-body">{avgRating} ({reviewCount} reviews)</span>
                  </div>
                )}
              </div>
              <h1 className="font-heading text-2xl md:text-3xl font-bold">{product.name}</h1>
              <p className="text-sm text-muted-foreground font-body mt-2">{product.description}</p>
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
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-muted-foreground font-body flex items-center gap-1">
                <Truck className="h-3 w-3" /> Estimated delivery: 3–5 business days
              </p>
              <p className="text-xs text-muted-foreground font-body flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-success flex-shrink-0" /> Free delivery on orders above ₹599
              </p>
            </div>

            <Separator />

            {/* Color selection */}
            {product.colors.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold font-body mb-2">Color: <span className="font-normal text-muted-foreground">{currentColorObj?.name || ""}</span></h3>
                <div className="flex gap-2">
                  {product.colors.map((c) => (
                    <button key={c.hex} onClick={() => handleColorChange(c.hex)} className={cn("h-8 w-8 rounded-full border-2 transition-all", c.hex === selectedColor ? "border-primary ring-2 ring-primary/30 scale-110" : "border-border")} style={{ backgroundColor: c.hex }} aria-label={c.name} />
                  ))}
                </div>
              </div>
            )}

            {/* Size selection */}
            {(allVariantSizes.length > 0 || product.sizes.length > 0) && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold font-body">Select Size</h3>
                  <SizeGuideModal trigger={<button className="text-xs text-primary underline font-body">Size Guide</button>} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {(allVariantSizes.length > 0 ? allVariantSizes : product.sizes).map((s) => {
                    const available = colorSizes.includes(s) || (allVariantSizes.length === 0 && product.availableSizes.includes(s));
                    return (
                      <button key={s} disabled={!available} onClick={() => setSelectedSize(s)}
                        className={cn("h-10 w-12 rounded-lg border text-sm font-medium transition-all font-body", !available && "opacity-30 cursor-not-allowed line-through", selectedSize === s ? "bg-primary text-primary-foreground border-primary scale-105" : "border-border hover:border-primary")}>{s}</button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity selection */}
            <div>
              <h3 className="text-sm font-semibold font-body mb-2">Quantity</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-border rounded-lg">
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-medium font-body">{quantity}</span>
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground" onClick={() => setQuantity(Math.min(10, quantity + 1))} disabled={quantity >= 10}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground font-body">Maximum 10 items per order</p>
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
                  {product.material && <p><strong>Material:</strong> {product.material}</p>}
                  {product.fit && <p><strong>Fit:</strong> {product.fit}</p>}
                  {product.occasion && <p><strong>Occasion:</strong> {product.occasion}</p>}
                  {product.careInstructions && <p><strong>Care:</strong> {product.careInstructions}</p>}
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

        {/* Reviews Section */}
        <section className="mt-12">
          <h2 className="font-heading text-xl font-bold mb-6">Customer Reviews</h2>

          {reviewCount > 0 ? (
            <div className="grid md:grid-cols-[240px_1fr] gap-8 mb-8">
              <div className="text-center md:text-left">
                <p className="text-4xl font-bold font-body">{avgRating}</p>
                <StarRating rating={avgRating} size="md" className="justify-center md:justify-start mt-1" />
                <p className="text-xs text-muted-foreground mt-1 font-body">{reviewCount} review{reviewCount !== 1 ? "s" : ""}</p>
                <div className="mt-4 space-y-1.5">
                  {ratingBreakdown.map(({ star, count, percent }) => (
                    <div key={star} className="flex items-center gap-2 text-xs font-body">
                      <span className="w-3">{star}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="text-muted-foreground w-6 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {(showAllReviews ? reviews : reviews.slice(0, 3)).map((r: any) => (
                  <div key={r.id} className="p-4 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary font-body">
                          {(r.customer_name || "A").charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium font-body">{r.customer_name}</p>
                          {r.is_verified && <Badge variant="secondary" className="text-[10px]">Verified Purchase</Badge>}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground font-body">{new Date(r.created_at).toLocaleDateString("en-IN")}</span>
                    </div>
                    <StarRating rating={r.rating} size="sm" className="mb-1" />
                    {r.title && <p className="text-sm font-semibold font-body">{r.title}</p>}
                    <p className="text-sm text-muted-foreground font-body">{r.body}</p>
                  </div>
                ))}
                {reviews.length > 3 && !showAllReviews && (
                  <Button variant="outline" onClick={() => setShowAllReviews(true)}>Show More Reviews</Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground font-body mb-6">No reviews yet. Be the first to review this product!</p>
          )}

          {/* Write a Review Form */}
          <div className="border border-border rounded-lg p-6 max-w-2xl">
            <h3 className="font-heading text-lg font-semibold mb-4">Write a Review</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-body text-sm">Your Name *</Label>
                  <Input value={reviewName} onChange={(e) => setReviewName(e.target.value)} placeholder="John Doe" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-sm">Email (optional)</Label>
                  <Input value={reviewEmail} onChange={(e) => setReviewEmail(e.target.value)} placeholder="john@example.com" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-sm">Order Number (for verified badge)</Label>
                <Input value={reviewOrderNumber} onChange={(e) => setReviewOrderNumber(e.target.value)} placeholder="ORD-2026-XXXXX" />
                <p className="text-[11px] text-muted-foreground font-body">Enter your order number to get a "Verified Purchase" badge</p>
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-sm">Rating *</Label>
                <StarRating rating={reviewRating} size="lg" interactive onChange={setReviewRating} />
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-sm">Review Title</Label>
                <Input value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} placeholder="Great product!" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-sm">Your Review *</Label>
                <Textarea value={reviewBody} onChange={(e) => setReviewBody(e.target.value)} placeholder="Share your experience..." rows={4} />
              </div>
              <Button onClick={handleSubmitReview} disabled={submittingReview}>
                {submittingReview ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Submit Review
              </Button>
            </div>
          </div>
        </section>

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
