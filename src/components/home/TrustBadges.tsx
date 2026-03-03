import { Truck, RotateCcw, ShieldCheck, Lock } from "lucide-react";
import { motion } from "framer-motion";

const badges = [
  { icon: Truck, title: "Free Delivery", desc: "On orders above ₹599" },
  { icon: RotateCcw, title: "Easy Returns", desc: "7-day return policy" },
  { icon: ShieldCheck, title: "100% Authentic", desc: "Genuine products" },
  { icon: Lock, title: "Secure Checkout", desc: "Safe & encrypted" },
];

export function TrustBadges() {
  return (
    <section className="container py-8 md:py-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {badges.map((b, i) => (
          <motion.div
            key={b.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="flex flex-col items-center text-center p-4 rounded-lg bg-card border border-border"
          >
            <b.icon className="h-6 w-6 text-primary mb-2" />
            <h3 className="text-sm font-semibold font-body">{b.title}</h3>
            <p className="text-xs text-muted-foreground font-body">{b.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
