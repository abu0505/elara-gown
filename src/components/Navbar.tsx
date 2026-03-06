import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, ShoppingBag, Menu, Home, Shirt, Sparkles, Flame, Tag, Package, RefreshCw, Phone, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useCartStore } from "@/stores/cartStore";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Shop All", href: "/products" },
  { label: "New Arrivals", href: "/products?filter=new" },
  { label: "Sale", href: "/products?category=sale" },
];

const mobileMenuLinks = [
  { label: "Home", href: "/", icon: Home },
  { label: "Shop All", href: "/products", icon: Shirt },
  { label: "New Arrivals", href: "/products?filter=new", icon: Sparkles },
  { label: "Best Sellers", href: "/products?filter=bestseller", icon: Flame },
  { label: "Sale", href: "/products?category=sale", icon: Tag },
  { label: "Track My Order", href: "/account/orders", icon: Package },
  { label: "Returns", href: "/returns", icon: RefreshCw },
  { label: "Contact Us", href: "/contact", icon: Phone },
  { label: "About Us", href: "/about", icon: Info },
];

interface NavbarProps {
  onSearchOpen: () => void;
  onCartOpen: () => void;
}

export function Navbar({ onSearchOpen, onCartOpen }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const totalItems = useCartStore((s) => s.getTotalItems());
  const location = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-background/95 backdrop-blur-md shadow-navbar"
          : "bg-background"
      )}
    >
      <div className="container flex items-center justify-between h-14 md:h-16">
        {/* Mobile menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <div className="p-6">
              <Link to="/" className="font-heading text-2xl font-bold text-primary" onClick={() => setMobileOpen(false)}>
                Elara
              </Link>
            </div>
            <nav className="flex flex-col">
              {mobileMenuLinks.map((link) => (
                <Link
                  key={link.href + link.label}
                  to={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "px-6 py-3 text-base font-medium transition-colors hover:bg-secondary",
                    location.pathname === link.href && "text-primary bg-secondary"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link to="/" className="font-heading text-xl md:text-2xl font-bold text-primary">
          Elara
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                location.pathname === link.href ? "text-primary" : "text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Icons */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Search" onClick={onSearchOpen}>
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Cart" className="relative" onClick={onCartOpen}>
            <ShoppingBag className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-semibold">
                {totalItems}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
