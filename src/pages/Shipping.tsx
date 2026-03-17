const Shipping = () => (
  <div className="animate-in fade-in duration-200 container py-8 md:py-12 max-w-3xl">
    <h1 className="font-heading text-2xl md:text-3xl font-bold mb-8">Shipping Information</h1>
    <div className="space-y-8 text-sm text-muted-foreground font-body">
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">Delivery Zones</h2><p>We deliver across India — all states and union territories are covered.</p></section>
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">Delivery Times</h2>
        <div className="space-y-2"><p><strong className="text-foreground">Standard Delivery:</strong> 3–5 business days — ₹49 (Free on orders above ₹599)</p><p><strong className="text-foreground">Express Delivery:</strong> 1–2 business days — ₹99</p></div></section>
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">Order Processing</h2><p>Orders placed before 3 PM IST are dispatched the same day. Orders after 3 PM are processed the next business day.</p></section>
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">Tracking</h2><p>A tracking link will be shared via SMS and email once your order is dispatched. You can also use our Track Order page.</p></section>
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">Damaged in Transit</h2><p>If your package arrives damaged, contact us within 24 hours of delivery with photos. We'll arrange a replacement or full refund at no extra cost.</p></section>
    </div>
  </div>
);

export default Shipping;
