import { Link, useLocation } from "react-router-dom";
import { Home, Search, ShoppingBag, User } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  onSearchOpen: () => void;
  onCartOpen: () => void;
}

const items = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Search, label: "Search", href: "#search" },
  { icon: ShoppingBag, label: "Cart", href: "#cart" },
  { icon: User, label: "Account", href: "#account" },
];

export function BottomNav({ onSearchOpen, onCartOpen }: BottomNavProps) {
  const location = useLocation();
  const totalItems = useCartStore((s) => s.getTotalItems());

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          const isActive = item.href === "/" ? location.pathname === "/" : false;
          const handleClick = () => {
            if (item.href === "#search") onSearchOpen();
            if (item.href === "#cart") onCartOpen();
          };

          if (item.href.startsWith("#")) {
            return (
              <button
                key={item.label}
                onClick={handleClick}
                className="flex flex-col items-center gap-0.5 py-1 px-3 relative"
                aria-label={item.label}
              >
                <item.icon className={cn("h-5 w-5", "text-muted-foreground")} />
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
                {item.label === "Cart" && totalItems > 0 && (
                  <span className="absolute top-0 right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-semibold">
                    {totalItems}
                  </span>
                )}
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              to={item.href}
              className="flex flex-col items-center gap-0.5 py-1 px-3"
            >
              <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-[10px]", isActive ? "text-primary font-medium" : "text-muted-foreground")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
