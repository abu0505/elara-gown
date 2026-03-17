import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Package, RotateCcw, MessageCircle, Mail, Search } from "lucide-react";

const quickActions = [
  { icon: Package, title: "Track My Order", desc: "Check your order status", href: "/account/orders" },
  { icon: RotateCcw, title: "Return / Exchange", desc: "Initiate a return", href: "/returns" },
  { icon: MessageCircle, title: "Chat with Us", desc: "WhatsApp support", href: "https://wa.me/919876543210" },
  { icon: Mail, title: "Email Support", desc: "Send us a message", href: "/contact" },
];

const popularFAQs = [
  { q: "How long does delivery take?", a: "Standard: 3–5 days. Express: 1–2 days." },
  { q: "What is your return policy?", a: "7-day return window. Items must be unused with tags attached." },
  { q: "How do I track my order?", a: "Visit the Track Order page with your order number and phone." },
  { q: "Do you offer COD?", a: "Yes, COD is available on orders under ₹5,000." },
];

const Support = () => {
  const [search, setSearch] = useState("");
  const filteredFAQs = popularFAQs.filter(f => !search || f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-in fade-in duration-200 container py-8 md:py-12">
      <div className="max-w-2xl mx-auto text-center mb-10">
        <h1 className="font-heading text-2xl md:text-3xl font-bold mb-4">How can we help you?</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search for help..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-12" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {quickActions.map((action, i) => (
          <Link key={i} to={action.href}>
            <Card className="hover:shadow-card-hover transition-shadow h-full">
              <CardContent className="p-4 text-center space-y-2">
                <action.icon className="h-6 w-6 text-primary mx-auto" />
                <h3 className="text-sm font-medium font-body">{action.title}</h3>
                <p className="text-xs text-muted-foreground font-body">{action.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <div className="max-w-2xl mx-auto">
        <h2 className="font-heading text-lg font-semibold mb-4">Popular Topics</h2>
        <Accordion type="multiple">
          {filteredFAQs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="font-body text-sm text-left">{faq.q}</AccordionTrigger>
              <AccordionContent className="font-body text-sm text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground font-body mb-3">Still need help?</p>
          <Link to="/contact" className="text-primary text-sm font-medium font-body hover:underline">Contact Us →</Link>
        </div>
      </div>
    </div>
  );
};

export default Support;
