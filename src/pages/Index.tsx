import { HeroCarousel } from "@/components/home/HeroCarousel";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { ProductSection } from "@/components/home/ProductSection";
import { PromoBanner } from "@/components/home/PromoBanner";
import { TrustBadges } from "@/components/home/TrustBadges";
import { LookbookStrip } from "@/components/home/LookbookStrip";
import { Newsletter } from "@/components/home/Newsletter";
import { useNewArrivals, useBestSellers } from "@/hooks/useProducts";

const Index = () => {
  const { data: newArrivals } = useNewArrivals();
  const { data: bestSellers } = useBestSellers();

  return (
    <div>
      <HeroCarousel />
      <CategoryGrid />
      <ProductSection title="New Arrivals" products={newArrivals || []} viewAllLink="/products?filter=new" />
      <PromoBanner />
      <ProductSection title="Best Sellers" products={bestSellers || []} viewAllLink="/products" />
      <TrustBadges />
      <LookbookStrip />
      <Newsletter />
    </div>
  );
};

export default Index;
