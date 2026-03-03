import { Link } from "react-router-dom";

const images = [
  { src: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80&fit=crop&auto=format", link: "/products?category=casual" },
  { src: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&q=80&fit=crop&auto=format", link: "/products?category=western" },
  { src: "https://images.unsplash.com/photo-1485968579996-35ef4f4fbb9e?w=400&q=80&fit=crop&auto=format", link: "/products?category=party" },
  { src: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80&fit=crop&auto=format", link: "/products?category=party" },
  { src: "https://images.unsplash.com/photo-1475180098004-ca77a66827be?w=400&q=80&fit=crop&auto=format", link: "/products?category=western" },
  { src: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400&q=80&fit=crop&auto=format", link: "/products?category=ethnic" },
];

export function LookbookStrip() {
  return (
    <section className="container py-8 md:py-16">
      <h2 className="font-heading text-xl md:text-2xl font-bold text-center mb-6">Style Inspiration</h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4">
        {images.map((img, i) => (
          <Link
            key={i}
            to={img.link}
            className="min-w-[150px] md:min-w-[200px] aspect-square rounded-lg overflow-hidden flex-shrink-0 snap-start hover:opacity-90 transition-opacity"
          >
            <img
              src={img.src}
              alt={`Style inspiration ${i + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
              width={200}
              height={200}
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
