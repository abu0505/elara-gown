import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { categories as hardcodedCategories } from "@/data/categories";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SlidersHorizontal, X } from "lucide-react";
import { useFilterStore, type SortOption } from "@/stores/filterStore";
import { useAllProducts } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const ITEMS_PER_PAGE = 12;

const Products = () => {
  const [searchParams] = useSearchParams();
  const urlCategory = searchParams.get("category");
  const urlFilter = searchParams.get("filter");
  const urlSearch = searchParams.get("search");

  const { data: dbProducts, isLoading: isProductsLoading } = useAllProducts();
  const allProducts = dbProducts || [];

  const { data: dbCategories } = useQuery({
    queryKey: ["categories", "active-for-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error || !data || data.length === 0) return null;
      return data.map((c) => ({ id: c.slug, name: c.name }));
    },
    staleTime: 1000 * 60 * 5,
  });
  const categories = dbCategories || hardcodedCategories;

  const {
    category: filterCats, priceRange, sizes, sortBy,
    toggleCategory, setPriceRange, toggleSize, setSortBy, clearFilters, getActiveFilterCount,
  } = useFilterStore();

  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const activeCats = urlCategory ? [urlCategory] : filterCats;

  const filtered = useMemo(() => {
    let result = [...allProducts];

    if (urlFilter === "new") result = result.filter((p) => p.isNew);
    if (urlSearch) {
      const q = urlSearch.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.category.includes(q));
    }
    if (activeCats.length > 0) result = result.filter((p) => activeCats.includes(p.category));
    result = result.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);
    if (sizes.length > 0) result = result.filter((p) => sizes.some((s) => p.availableSizes.includes(s)));

    switch (sortBy) {
      case "price_asc": result.sort((a, b) => a.price - b.price); break;
      case "price_desc": result.sort((a, b) => b.price - a.price); break;
      case "popular": result.sort((a, b) => b.reviewCount - a.reviewCount); break;
      case "rating": result.sort((a, b) => b.rating - a.rating); break;
      case "newest":
      default:
        // Already sorted by 'created_at' descending from Supabase API
        // So we maintain the original array order
        break;
    }

    return result;
  }, [allProducts, activeCats, priceRange, sizes, sortBy, urlFilter, urlSearch]);

  const pageTitle = urlCategory
    ? categories.find((c) => c.id === urlCategory)?.name || "All Dresses"
    : urlFilter === "new" ? "New Arrivals" : urlSearch ? `Results for "${urlSearch}"` : "All Dresses";

  const filterCount = getActiveFilterCount();

  const FilterContent = () => (
    <div className="space-y-6 p-1">
      <div>
        <h4 className="text-sm font-semibold mb-3 font-body">Sort By</h4>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-full text-sm"><SelectValue placeholder="Sort by" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="price_asc">Price: Low to High</SelectItem>
            <SelectItem value="price_desc">Price: High to Low</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="rating">Top Rated</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <h4 className="text-sm font-semibold mb-3 font-body">Category</h4>
        <div className="space-y-2">
          {categories.map((c) => (
            <label key={c.id} className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={activeCats.includes(c.id)} onCheckedChange={() => toggleCategory(c.id)} />
              <span className="text-sm font-body">{c.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-sm font-semibold mb-3 font-body">Price Range</h4>
        <Slider value={priceRange} onValueChange={(v) => setPriceRange(v as [number, number])} min={0} max={15000} step={100} className="mb-2" />
        <div className="flex justify-between text-xs text-muted-foreground font-body">
          <span>₹{priceRange[0]}</span><span>₹{priceRange[1]}</span>
        </div>
      </div>
      <div>
        <h4 className="text-sm font-semibold mb-3 font-body">Size</h4>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <button key={s} onClick={() => toggleSize(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors font-body ${sizes.includes(s) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"}`}>{s}</button>
          ))}
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={clearFilters} className="w-full">Clear All Filters</Button>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <div className="container py-4 md:py-8">
        <nav className="text-xs text-muted-foreground mb-4 font-body">
          <Link to="/" className="hover:text-primary">Home</Link><span className="mx-1">/</span><span className="text-foreground">{pageTitle}</span>
        </nav>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-heading text-xl md:text-2xl font-bold">{pageTitle}</h1>
            <p className="text-xs text-muted-foreground font-body mt-1">Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} products</p>
          </div>
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="outline" size="sm" className="relative">
                  <SlidersHorizontal className="h-4 w-4 mr-1" />Filter & Sort
                  {filterCount > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">{filterCount}</span>}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
                <SheetHeader><SheetTitle className="font-heading">Filter & Sort</SheetTitle></SheetHeader>
                <FilterContent />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {(activeCats.length > 0 || sizes.length > 0) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {activeCats.map((c) => (<Badge key={c} variant="secondary" className="cursor-pointer gap-1 font-body" onClick={() => toggleCategory(c)}>{categories.find((cat) => cat.id === c)?.name}<X className="h-3 w-3" /></Badge>))}
            {sizes.map((s) => (<Badge key={s} variant="secondary" className="cursor-pointer gap-1 font-body" onClick={() => toggleSize(s)}>{s}<X className="h-3 w-3" /></Badge>))}
          </div>
        )}

        <div className="flex gap-8">
          <aside className="hidden md:block w-56 flex-shrink-0"><FilterContent /></aside>
          <div className="flex-1">
            {isProductsLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-lg font-heading mb-2">No products found</p>
                <p className="text-sm text-muted-foreground font-body mb-4">Try different filters</p>
                <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                  {filtered.slice(0, visibleCount).map((p) => (<ProductCard key={p.id} product={p} />))}
                </div>
                {visibleCount < filtered.length && (
                  <div className="text-center mt-8">
                    <Button variant="outline" onClick={() => setVisibleCount((c) => c + ITEMS_PER_PAGE)}>Load More</Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Products;
