import { motion } from "framer-motion";

const Terms = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container py-8 md:py-12 max-w-3xl">
    <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">Terms & Conditions</h1>
    <p className="text-xs text-muted-foreground font-body mb-8">Last updated: March 2026</p>
    <div className="space-y-8 text-sm text-muted-foreground font-body">
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">1. Acceptance of Terms</h2><p>By accessing and using Elara's website, you accept and agree to be bound by these terms and conditions.</p></section>
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">2. Use of Website</h2><p>You may use this website for personal, non-commercial purposes only. Prohibited activities include unauthorized access, scraping, and misuse of content.</p></section>
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">3. Product Information</h2><p>We strive for accuracy in product descriptions, images, and pricing. Slight color variations may occur due to screen settings.</p></section>
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">4. Pricing</h2><p>All prices are in Indian Rupees (₹) and inclusive of GST. Prices are subject to change without prior notice.</p></section>
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">5. Orders</h2><p>A binding contract is formed only when your order is dispatched, not upon placing the order. We reserve the right to cancel orders due to stock unavailability.</p></section>
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">6. Payment</h2><p>Payments are processed through Razorpay. By making a payment, you also agree to Razorpay's terms of service.</p></section>
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">7. Delivery</h2><p>Delivery timelines are estimates and not guaranteed. We are not liable for delays caused by shipping partners or unforeseen circumstances.</p></section>
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">8. Returns & Refunds</h2><p>Please refer to our Return Policy page for detailed information.</p></section>
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">9. Intellectual Property</h2><p>All content on this website — including images, logos, designs, and text — is owned by Elara and protected under copyright law.</p></section>
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">10. Governing Law</h2><p>These terms are governed by the laws of India. Disputes shall be subject to the exclusive jurisdiction of courts in Mumbai.</p></section>
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">11. Contact</h2><p>For legal inquiries, email legal@elara.store.</p></section>
    </div>
  </motion.div>
);

export default Terms;
