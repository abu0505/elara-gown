import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Award, Users } from "lucide-react";

const About = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
    <div className="relative h-[50vh] bg-muted overflow-hidden">
      <img src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1400&h=600&fit=crop" alt="Fashion editorial" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent flex items-end">
        <div className="container pb-10">
          <h1 className="font-heading text-3xl md:text-5xl font-bold">Dressed with Love,<br />Made for You</h1>
        </div>
      </div>
    </div>
    <div className="container py-12 space-y-16">
      <section className="max-w-2xl mx-auto text-center space-y-4">
        <h2 className="font-heading text-2xl font-bold">Our Story</h2>
        <p className="text-muted-foreground font-body">Founded in 2024, Elara was born out of a passion for making every woman feel confident and beautiful. We believe that the right dress can transform not just your look, but your entire day.</p>
        <p className="text-muted-foreground font-body">Our curated collection brings together contemporary designs with timeless elegance, ensuring there's something perfect for every occasion — from casual brunches to grand celebrations.</p>
      </section>
      <section>
        <h2 className="font-heading text-2xl font-bold text-center mb-8">Our Values</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Award, title: "Quality Fabrics", desc: "We source premium materials that feel as good as they look, ensuring lasting comfort and durability." },
            { icon: Heart, title: "Ethically Made", desc: "Every dress is crafted with care by skilled artisans, supporting fair wages and sustainable practices." },
            { icon: Users, title: "Size Inclusive", desc: "Fashion is for everyone. Our range spans XS to XXL, with fits designed for real bodies." },
          ].map((v, i) => (
            <Card key={i}>
              <CardContent className="p-6 text-center space-y-3">
                <v.icon className="h-8 w-8 text-primary mx-auto" />
                <h3 className="font-heading text-lg font-semibold">{v.title}</h3>
                <p className="text-sm text-muted-foreground font-body">{v.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <section className="bg-secondary rounded-2xl p-8 md:p-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[{ n: "10,000+", l: "Happy Customers" }, { n: "500+", l: "Styles" }, { n: "6", l: "Collections" }, { n: "4.8★", l: "Avg Rating" }].map((s, i) => (
            <div key={i}>
              <p className="text-2xl md:text-3xl font-bold font-heading text-primary">{s.n}</p>
              <p className="text-xs text-muted-foreground font-body mt-1">{s.l}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="text-center">
        <h2 className="font-heading text-2xl font-bold mb-4">Explore Our Collection</h2>
        <Button asChild size="lg"><Link to="/products">Shop Now</Link></Button>
      </section>
    </div>
  </motion.div>
);

export default About;
