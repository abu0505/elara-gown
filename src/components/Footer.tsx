import { Link } from "react-router-dom";
import { Instagram, Facebook, Youtube } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "Shop All", href: "/products" },
  { label: "New Arrivals", href: "/products?filter=new" },
  { label: "Sale", href: "/products?category=sale" },
];

const customerCare = [
  { label: "FAQs", href: "#" },
  { label: "Size Guide", href: "#" },
  { label: "Return Policy", href: "#" },
  { label: "Shipping Info", href: "#" },
];

export function Footer() {
  return (
    <footer className="bg-card border-t border-border pb-16 md:pb-0">
      {/* Desktop */}
      <div className="container hidden md:grid grid-cols-4 gap-8 py-12">
        <div>
          <h3 className="font-heading text-xl font-bold text-primary mb-3">Elara</h3>
          <p className="text-sm text-muted-foreground font-body mb-4">
            Curating beautiful dresses for the modern woman. Quality, style, and elegance — all in one place.
          </p>
          <div className="flex gap-3">
            <a href="#" aria-label="Instagram" className="text-muted-foreground hover:text-primary transition-colors">
              <Instagram className="h-5 w-5" />
            </a>
            <a href="#" aria-label="Facebook" className="text-muted-foreground hover:text-primary transition-colors">
              <Facebook className="h-5 w-5" />
            </a>
            <a href="#" aria-label="YouTube" className="text-muted-foreground hover:text-primary transition-colors">
              <Youtube className="h-5 w-5" />
            </a>
          </div>
        </div>
        <div>
          <h4 className="font-heading text-sm font-semibold mb-3">Quick Links</h4>
          <ul className="space-y-2">
            {quickLinks.map((l) => (
              <li key={l.label}>
                <Link to={l.href} className="text-sm text-muted-foreground hover:text-primary transition-colors font-body">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-heading text-sm font-semibold mb-3">Customer Care</h4>
          <ul className="space-y-2">
            {customerCare.map((l) => (
              <li key={l.label}>
                <Link to={l.href} className="text-sm text-muted-foreground hover:text-primary transition-colors font-body">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-heading text-sm font-semibold mb-3">Contact Us</h4>
          <ul className="space-y-2 text-sm text-muted-foreground font-body">
            <li>📍 Mumbai, Maharashtra</li>
            <li>📞 +91 98765 43210</li>
            <li>📧 hello@elara.store</li>
          </ul>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden px-4 py-6">
        <div className="text-center mb-6">
          <h3 className="font-heading text-xl font-bold text-primary mb-2">Elara</h3>
          <p className="text-xs text-muted-foreground font-body">Beautiful dresses for the modern woman.</p>
        </div>
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="quick">
            <AccordionTrigger className="text-sm font-heading">Quick Links</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2">
                {quickLinks.map((l) => (
                  <li key={l.label}>
                    <Link to={l.href} className="text-sm text-muted-foreground font-body">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="care">
            <AccordionTrigger className="text-sm font-heading">Customer Care</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2">
                {customerCare.map((l) => (
                  <li key={l.label}>
                    <Link to={l.href} className="text-sm text-muted-foreground font-body">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="contact">
            <AccordionTrigger className="text-sm font-heading">Contact Us</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2 text-sm text-muted-foreground font-body">
                <li>📍 Mumbai, Maharashtra</li>
                <li>📞 +91 98765 43210</li>
                <li>📧 hello@elara.store</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <Separator />
      <div className="container py-4 flex flex-col md:flex-row items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground font-body">© 2026 Elara. All rights reserved.</p>
        <div className="flex gap-4 text-xs text-muted-foreground font-body">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms & Conditions</a>
        </div>
      </div>
    </footer>
  );
}
