const PrivacyPolicy = () => (
  <div className="animate-in fade-in duration-200 container py-8 md:py-12 max-w-3xl">
    <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">Privacy Policy</h1>
    <p className="text-xs text-muted-foreground font-body mb-8">Last updated: March 2026</p>
    <div className="space-y-8 text-sm text-muted-foreground font-body">
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">1. Information We Collect</h2><p>We collect information you provide: name, email, phone number, delivery address, and browsing data. Payment information is processed securely through Razorpay — we never store your card details.</p></section>
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">2. How We Use Your Information</h2><ul className="list-disc pl-5 space-y-1"><li>Processing and delivering your orders</li><li>Providing customer support</li><li>Sending order updates and promotional communications (with opt-out)</li><li>Improving our website and services</li></ul></section>
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">3. Data Storage & Security</h2><p>Your data is stored securely on Supabase-hosted servers with encryption at rest and in transit.</p></section>
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">4. Cookies</h2><p>We use essential cookies for site functionality and analytics cookies to understand usage patterns. You can manage cookie preferences in your browser settings.</p></section>
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">5. Third-Party Services</h2><p>We use Razorpay for payments, Supabase for data storage, and may use analytics services. Each has its own privacy policy.</p></section>
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">6. Your Rights</h2><p>You have the right to access, correct, or delete your personal data. Contact us at privacy@elara.store for any requests.</p></section>
      <section><h2 className="font-heading text-lg font-semibold text-foreground mb-3">7. Contact</h2><p>For privacy concerns, email us at privacy@elara.store.</p></section>
    </div>
  </div>
);

export default PrivacyPolicy;
