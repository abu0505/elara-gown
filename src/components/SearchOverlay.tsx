import { useState, useEffect, useRef } from "react";
import { Search, X, TrendingUp, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { products } from "@/data/products";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const trendingSearches = ["Party Dresses", "Summer Collection", "Under ₹999", "Floral Dresses", "Ethnic Wear"];

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [recent, setRecent] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("recentSearches") || "[]"); } catch { return []; }
  });

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const filtered = query.length >= 2
    ? products.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  const saveSearch = (term: string) => {
    const updated = [term, ...recent.filter((r) => r !== term)].slice(0, 5);
    setRecent(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-md"
        >
          <div className="container max-w-2xl mx-auto pt-4">
            <div className="flex items-center gap-2 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search dresses, categories..."
                  className="pl-10 h-12 text-base"
                />
              </div>
              <button onClick={onClose} className="p-2" aria-label="Close search">
                <X className="h-5 w-5" />
              </button>
            </div>

            {query.length < 2 ? (
              <div className="space-y-6">
                {recent.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1 font-body">
                      <Clock className="h-3 w-3" /> Recent Searches
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {recent.map((r) => (
                        <Link
                          key={r}
                          to={`/products?search=${encodeURIComponent(r)}`}
                          onClick={() => { saveSearch(r); onClose(); }}
                          className="px-3 py-1.5 rounded-full border border-border text-sm hover:bg-secondary transition-colors font-body"
                        >
                          {r}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1 font-body">
                    <TrendingUp className="h-3 w-3" /> Trending Searches
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {trendingSearches.map((t) => (
                      <Link
                        key={t}
                        to={`/products?search=${encodeURIComponent(t)}`}
                        onClick={() => { saveSearch(t); onClose(); }}
                        className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm hover:bg-primary hover:text-primary-foreground transition-colors font-body"
                      >
                        {t}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {filtered.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12 font-body">No products found</p>
                ) : (
                  filtered.map((p) => (
                    <Link
                      key={p.id}
                      to={`/products/${p.id}`}
                      onClick={() => { saveSearch(p.name); onClose(); }}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
                    >
                      <img src={p.images[0]} alt={p.name} className="w-12 h-15 object-cover rounded" width={48} height={60} />
                      <div>
                        <p className="text-sm font-medium font-body">{p.name}</p>
                        <p className="text-xs text-muted-foreground font-body">₹{p.price.toLocaleString()}</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
