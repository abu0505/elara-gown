import { motion } from "framer-motion";

const Returns = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container py-8 md:py-12 max-w-3xl">
    <h1 className="font-heading text-2xl md:text-3xl font-bold mb-8">Return Policy</h1>
    <div className="space-y-8 text-sm text-muted-foreground font-body">
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">7-Day Return Window</h2><p>We offer a hassle-free 7-day return window from the date of delivery. If you're not completely satisfied with your purchase, we're here to help.</p></section>
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">Eligible Items</h2><ul className="list-disc pl-5 space-y-1"><li>Items must be unused and unwashed</li><li>All original tags must be attached</li><li>Items must be in their original packaging</li><li>Must be returned within 7 days of delivery</li></ul></section>
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">Non-Eligible Items</h2><ul className="list-disc pl-5 space-y-1"><li>Innerwear and swimwear</li><li>Items marked as "Final Sale" or non-returnable</li><li>Items that have been altered, washed, or worn</li><li>Items without original tags and packaging</li></ul></section>
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">Return Process</h2><ol className="list-decimal pl-5 space-y-2"><li>Contact us via the Contact page or WhatsApp with your order number</li><li>Share photos of the item you wish to return</li><li>We'll arrange a pickup within 24–48 hours</li><li>Refund will be initiated within 5–7 business days after inspection</li></ol></section>
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">Refund Methods</h2><ul className="list-disc pl-5 space-y-1"><li>Original payment source (5–7 business days)</li><li>Store credit with 10% bonus (instant)</li></ul></section>
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">Exchange Policy</h2><p>Exchanges are available for a different size or color, subject to availability. Contact us to initiate an exchange.</p></section>
    </div>
  </motion.div>
);

export default Returns;
