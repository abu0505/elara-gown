import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Package, MapPin } from "lucide-react";
import { motion } from "framer-motion";

const OrderSuccess = () => {
  const orderId = `ORD-2026-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container py-12 md:py-20 max-w-lg mx-auto text-center"
    >
      {/* Checkmark animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 10, stiffness: 100, delay: 0.1 }}
        className="h-20 w-20 rounded-full bg-success mx-auto flex items-center justify-center mb-6"
      >
        <Check className="h-10 w-10 text-success-foreground" strokeWidth={3} />
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">Order Placed Successfully! 🎉</h1>
        <p className="text-muted-foreground font-body mb-6">Thank you for shopping with Elara</p>

        <div className="bg-card rounded-lg border border-border p-6 text-left space-y-4 mb-8">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-body">Order ID</p>
              <p className="text-sm font-semibold font-body">{orderId}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-body">Estimated Delivery</p>
              <p className="text-sm font-semibold font-body">3–5 business days</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to="/products">Continue Shopping</Link>
          </Button>
          <Button variant="outline" disabled>
            Track Your Order
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default OrderSuccess;
