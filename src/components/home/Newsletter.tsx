import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function Newsletter() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    toast.success("You're in! Check your inbox for your welcome offer!");
    setEmail("");
  };

  return (
    <section className="bg-secondary py-10 md:py-16">
      <div className="container text-center max-w-lg mx-auto">
        <h2 className="font-heading text-xl md:text-2xl font-bold mb-2">Get Exclusive Offers in Your Inbox</h2>
        <p className="text-sm text-muted-foreground font-body mb-6">
          Subscribe and get 10% off your first order
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 h-11"
            required
          />
          <Button type="submit" className="h-11 px-6 rounded-full">
            Subscribe
          </Button>
        </form>
      </div>
    </section>
  );
}
