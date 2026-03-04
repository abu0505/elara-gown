import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqSections = [
  { title: "Orders & Delivery", items: [
    { q: "How long does delivery take?", a: "Standard delivery takes 3–5 business days. Express delivery is 1–2 business days." },
    { q: "Do you offer same-day delivery?", a: "Currently, we don't offer same-day delivery. Express delivery (1–2 days) is our fastest option." },
    { q: "How can I track my order?", a: "Once your order is shipped, you'll receive a tracking link via SMS and email. You can also track via our Track Order page." },
    { q: "Can I change/cancel my order after placing it?", a: "You can cancel within 1 hour of placing the order. Contact us immediately for modifications." },
  ]},
  { title: "Returns & Refunds", items: [
    { q: "What is your return policy?", a: "We offer a 7-day return window from the date of delivery. Items must be unused with tags attached." },
    { q: "How do I initiate a return?", a: "Contact us via the Contact page or WhatsApp with your order number and reason. We'll arrange a pickup within 24–48 hours." },
    { q: "When will I receive my refund?", a: "Refunds are processed within 5–7 business days after we receive and inspect the returned item." },
    { q: "What items are non-returnable?", a: "Innerwear, swimwear, and items marked as 'Final Sale' or non-returnable are not eligible for returns." },
  ]},
  { title: "Products & Sizing", items: [
    { q: "How do I choose the right size?", a: "Check our Size Guide page for detailed measurements. If between sizes, we recommend sizing up." },
    { q: "Are the colors accurate in photos?", a: "We strive for accuracy, but slight variations may occur due to screen settings and lighting." },
    { q: "What fabrics do you use?", a: "We use premium cotton, georgette, chiffon, crepe, silk blends, and other quality fabrics. Each product page lists the specific material." },
  ]},
  { title: "Payments", items: [
    { q: "What payment methods do you accept?", a: "We accept UPI, credit/debit cards, net banking, and wallets via Razorpay. Cash on Delivery is also available." },
    { q: "Is it safe to use my card on your site?", a: "Absolutely. All payments are processed through Razorpay's secure, PCI-compliant gateway. We never store your card details." },
    { q: "Do you offer Cash on Delivery?", a: "Yes, COD is available on orders under ₹5,000 for select pin codes." },
  ]},
];

const FAQ = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container py-8 md:py-12 max-w-3xl">
    <h1 className="font-heading text-2xl md:text-3xl font-bold mb-8">Frequently Asked Questions</h1>
    <div className="space-y-8">
      {faqSections.map((section, i) => (
        <div key={i}>
          <h2 className="font-heading text-lg font-semibold mb-3">{section.title}</h2>
          <Accordion type="multiple">
            {section.items.map((item, j) => (
              <AccordionItem key={j} value={`${i}-${j}`}>
                <AccordionTrigger className="font-body text-sm text-left">{item.q}</AccordionTrigger>
                <AccordionContent className="font-body text-sm text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  </motion.div>
);

export default FAQ;
