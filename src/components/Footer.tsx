import { Link } from "react-router-dom";
import { MapPin, Phone as PhoneIcon, Mail } from "lucide-react";
import { Instagram, Facebook, Youtube } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "Shop All", href: "/products" },
  { label: "New Arrivals", href: "/products?filter=new" },
  { label: "Sale", href: "/products?category=sale" },
  { label: "About Us", href: "/about" },
];

const customerCare = [
  { label: "Track Order", href: "/account/orders" },
  { label: "Returns & Refunds", href: "/returns" },
  { label: "Shipping Info", href: "/shipping" },
  { label: "Size Guide", href: "/size-guide" },
  { label: "FAQs", href: "/faq" },
  { label: "Contact Us", href: "/contact" },
];

const legal = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms" },
];

export function Footer() {
  return (
    <footer className="bg-card border-t border-border pb-16 md:pb-0">
      <div className="container hidden md:grid grid-cols-4 gap-8 py-12">
        <div>
          <h3 className="font-heading text-xl font-bold text-primary mb-3">Elara</h3>
          <p className="text-sm text-muted-foreground font-body mb-4">Curating beautiful dresses for the modern woman. Quality, style, and elegance — all in one place.</p>
          <div className="flex gap-3">
            <a href="#" aria-label="Instagram" className="text-muted-foreground hover:text-primary transition-colors"><Instagram className="h-5 w-5" /></a>
            <a href="#" aria-label="Facebook" className="text-muted-foreground hover:text-primary transition-colors"><Facebook className="h-5 w-5" /></a>
            <a href="#" aria-label="YouTube" className="text-muted-foreground hover:text-primary transition-colors"><Youtube className="h-5 w-5" /></a>
          </div>
        </div>
        <div>
          <h4 className="font-heading text-sm font-semibold mb-3">Quick Links</h4>
          <ul className="space-y-2">{quickLinks.map((l) => (<li key={l.label}><Link to={l.href} className="text-sm text-muted-foreground hover:text-primary transition-colors font-body">{l.label}</Link></li>))}</ul>
        </div>
        <div>
          <h4 className="font-heading text-sm font-semibold mb-3">Customer Care</h4>
          <ul className="space-y-2">{customerCare.map((l) => (<li key={l.label}><Link to={l.href} className="text-sm text-muted-foreground hover:text-primary transition-colors font-body">{l.label}</Link></li>))}</ul>
        </div>
        <div>
          <h4 className="font-heading text-sm font-semibold mb-3">Contact Us</h4>
          <ul className="space-y-2 text-sm text-muted-foreground font-body">
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 flex-shrink-0" /> Mumbai, Maharashtra</li>
            <li><a href="tel:+919876543210" className="hover:text-primary flex items-center gap-2"><PhoneIcon className="h-4 w-4 flex-shrink-0" /> +91 98765 43210</a></li>
            <li><a href="mailto:hello@elara.store" className="hover:text-primary flex items-center gap-2"><Mail className="h-4 w-4 flex-shrink-0" /> hello@elara.store</a></li>
          </ul>
        </div>
      </div>
      <div className="md:hidden px-4 py-6">
        <div className="text-center mb-6">
          <h3 className="font-heading text-xl font-bold text-primary mb-2">Elara</h3>
          <p className="text-xs text-muted-foreground font-body">Beautiful dresses for the modern woman.</p>
        </div>
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="quick"><AccordionTrigger className="text-sm font-heading">Quick Links</AccordionTrigger><AccordionContent><ul className="space-y-2">{quickLinks.map((l) => (<li key={l.label}><Link to={l.href} className="text-sm text-muted-foreground font-body">{l.label}</Link></li>))}</ul></AccordionContent></AccordionItem>
          <AccordionItem value="care"><AccordionTrigger className="text-sm font-heading">Customer Care</AccordionTrigger><AccordionContent><ul className="space-y-2">{customerCare.map((l) => (<li key={l.label}><Link to={l.href} className="text-sm text-muted-foreground font-body">{l.label}</Link></li>))}</ul></AccordionContent></AccordionItem>
          <AccordionItem value="contact"><AccordionTrigger className="text-sm font-heading">Contact Us</AccordionTrigger><AccordionContent><ul className="space-y-2 text-sm text-muted-foreground font-body"><li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Mumbai, Maharashtra</li><li className="flex items-center gap-2"><PhoneIcon className="h-4 w-4" /> +91 98765 43210</li><li className="flex items-center gap-2"><Mail className="h-4 w-4" /> hello@elara.store</li></ul></AccordionContent></AccordionItem>
        </Accordion>
      </div>
      <Separator />
      <div className="container py-4 flex flex-col md:flex-row items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground font-body">© 2026 Elara. All rights reserved.</p>
        <div className="flex gap-4 text-xs text-muted-foreground font-body">
          {legal.map(l => <Link key={l.label} to={l.href} className="hover:text-primary">{l.label}</Link>)}
        </div>
      </div>
    </footer>
  );
}
