import { PartyPopper } from "lucide-react";

export function PromoBanner() {
  return (
    <section className="bg-primary text-primary-foreground py-4 md:py-5">
      <div className="container text-center">
        <p className="text-sm md:text-base font-semibold font-body tracking-wide flex items-center justify-center gap-2">
          <PartyPopper className="h-4 w-4" /> FLAT 30% OFF on orders above ₹999 | Use Code: <span className="underline">DRESS30</span>
        </p>
      </div>
    </section>
  );
}
