import { Link } from "react-router-dom";
import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2, ShoppingBag, Lock, Tag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const Cart = () => {
  const { items, updateQuantity, removeItem, getSubtotal, getDeliveryCharge, getDiscount, getTotal, applyCoupon, removeCoupon, couponCode } = useCartStore();
  const [couponInput, setCouponInput] = useState("");

  const handleApplyCoupon = () => {
    if (applyCoupon(couponInput)) {
      toast.success(`Coupon ${couponInput.toUpperCase()} applied!`);
      setCouponInput("");
    } else {
      toast.error("Invalid coupon code");
    }
  };

  if (items.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container py-20 text-center">
        <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="font-heading text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-muted-foreground font-body mb-6">Start shopping to add items to your bag</p>
        <Button asChild><Link to="/products">Start Shopping</Link></Button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <div className="container py-4 md:py-8">
        <h1 className="font-heading text-2xl font-bold mb-6">Shopping Bag</h1>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Items */}
          <div className="md:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex gap-4 p-4 rounded-lg border border-border">
                <img src={item.image} alt={item.name} className="w-20 h-24 md:w-24 md:h-30 object-cover rounded" width={96} height={120} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="text-sm font-medium font-body line-clamp-1">{item.name}</h3>
                      <p className="text-xs text-muted-foreground font-body mt-0.5">{item.colorName} · Size {item.size}</p>
                    </div>
                    <button onClick={() => { removeItem(item.id); toast("🗑️ Removed from cart"); }} aria-label="Remove">
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="h-8 w-8 rounded border border-border flex items-center justify-center"
                        aria-label="Decrease"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium font-body">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="h-8 w-8 rounded border border-border flex items-center justify-center"
                        aria-label="Increase"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold font-body">₹{(item.price * item.quantity).toLocaleString()}</p>
                      {item.originalPrice > item.price && (
                        <p className="text-xs text-muted-foreground line-through font-body">₹{(item.originalPrice * item.quantity).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="space-y-4">
            {/* Coupon */}
            <div className="p-4 rounded-lg border border-border">
              <h3 className="text-sm font-semibold font-body mb-3 flex items-center gap-1">
                <Tag className="h-4 w-4" /> Coupon Code
              </h3>
              {couponCode ? (
                <div className="flex items-center justify-between bg-success/10 rounded-lg p-3">
                  <span className="text-sm font-medium text-success font-body">{couponCode} applied</span>
                  <button onClick={removeCoupon} className="text-xs text-destructive font-body">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter code"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="flex-1 h-9"
                  />
                  <Button size="sm" onClick={handleApplyCoupon} disabled={!couponInput}>
                    Apply
                  </Button>
                </div>
              )}
            </div>

            {/* Order summary */}
            <div className="p-4 rounded-lg border border-border space-y-3">
              <h3 className="text-sm font-semibold font-body">Order Summary</h3>
              <div className="flex justify-between text-sm font-body">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{getSubtotal().toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-body">
                <span className="text-muted-foreground">Delivery</span>
                <span className={getDeliveryCharge() === 0 ? "text-success" : ""}>
                  {getDeliveryCharge() === 0 ? "FREE" : `₹${getDeliveryCharge()}`}
                </span>
              </div>
              {getDiscount() > 0 && (
                <div className="flex justify-between text-sm font-body">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-success">-₹{getDiscount().toLocaleString()}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold font-body">
                <span>Total</span>
                <span className="text-lg">₹{getTotal().toLocaleString()}</span>
              </div>

              <Button asChild className="w-full h-12 mt-2">
                <Link to="/checkout">Proceed to Checkout</Link>
              </Button>
              <p className="text-xs text-center text-muted-foreground font-body flex items-center justify-center gap-1">
                <Lock className="h-3 w-3" /> Secure Checkout
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Cart;
