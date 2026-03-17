import { Link } from "react-router-dom";
import { useLookbookImages } from "@/hooks/useProducts";
import { Skeleton } from "@/components/ui/skeleton";

export function LookbookStrip() {
  const { data: images, isLoading } = useLookbookImages();

  if (isLoading) {
    return (
      <section className="container py-8 md:py-16">
        <h2 className="font-heading text-xl md:text-2xl font-bold text-center mb-6">Style Inspiration</h2>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="max-w-[65vw] max-h-[40vh] aspect-[3/4] rounded-lg overflow-hidden flex-shrink-0 snap-start">
              <Skeleton className="w-full h-full" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!images || images.length === 0) return null;

  return (
    <section className="container py-8 md:py-16">
      <h2 className="font-heading text-xl md:text-2xl font-bold text-center mb-6">Style Inspiration</h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4">
        {images.map((img, i) => (
          <div
            key={i}
            className="max-w-[65vw] max-h-[40vh] aspect-[3/4] rounded-lg overflow-hidden flex-shrink-0 snap-start transition-opacity group relative"
          >
            <Link to={img.link} className="block w-full h-full">
              <img
                src={img.src}
                alt={`Style inspiration ${i + 1}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                width={160}
                height={213}
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <span className="text-white font-medium text-xs md:text-sm border border-white/50 px-3 py-1.5 md:px-4 md:py-2 rounded-full backdrop-blur-sm">Shop the Look</span>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
