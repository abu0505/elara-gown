import { Truck, RotateCcw, ShieldCheck, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const badges = [
  { icon: Truck, title: "Free Delivery", desc: "On orders above ₹599" },
  { icon: RotateCcw, title: "Easy Returns", desc: "7-day return policy" },
  { icon: ShieldCheck, title: "100% Authentic", desc: "Genuine products" },
  { icon: Lock, title: "Secure Checkout", desc: "Safe & encrypted" },
];

export function TrustBadges() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="container py-8 md:py-12" ref={ref}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {badges.map((b, i) => (
          <div
            key={b.title}
            className="flex flex-col items-center text-center p-4 rounded-lg bg-card border border-border transition-all duration-300"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(20px)",
              transitionDelay: `${i * 100}ms`,
            }}
          >
            <b.icon className="h-6 w-6 text-primary mb-2" />
            <h3 className="text-sm font-semibold font-body">{b.title}</h3>
            <p className="text-xs text-muted-foreground font-body">{b.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
