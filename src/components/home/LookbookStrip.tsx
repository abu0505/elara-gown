import { Link } from "react-router-dom";

const images = [
  { src: "/media/Blush%20Pink%20Organza%20Designer%20Lehenga%20with%20Ruffles_front.png", link: "/products?category=Bridal" },
  { src: "/media/Emerald%20Green%20Georgette%20Anarkali%20with%20Sequin%20Work_front.png", link: "/products?category=Party" },
  { src: "/media/Ivory%20Net%20Bridal%20Lehenga%20with%20Pastel%20Floral%20Threadwork_front.png", link: "/products?category=Bridal" },
  { src: "/media/Midnight%20Blue%20Velvet%20Anarkali%20with%20Antique%20Gold%20Motif_front.png", link: "/products?category=Party" },
  { src: "/media/Mustard%20Yellow%20Cotton%20Silk%20Anarkali%20with%20Mirror%20Work_front.png", link: "/products?category=Festive" },
  { src: "/media/Regal%20Red%20Silk%20Anarkali%20with%20Zari%20Embroidery_front.png", link: "/products?category=Festive" },
];

export function LookbookStrip() {
  return (
    <section className="container py-8 md:py-16">
      <h2 className="font-heading text-xl md:text-2xl font-bold text-center mb-6">Style Inspiration</h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4">
        {images.map((img, i) => (
          <div
            key={i}
            className="max-w-[65vw] max-h-[40vh] aspect-[3/4] rounded-lg overflow-hidden flex-shrink-0 snap-start transition-opacity"
          >
            <img
              src={img.src}
              alt={`Style inspiration ${i + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
              width={160}
              height={213}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
