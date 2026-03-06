import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const SUBJECTS = ["Order Issue", "Return/Refund", "Product Query", "General Inquiry", "Other"];

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !subject || !message) { toast.error("Please fill required fields"); return; }
    setSending(true);
    const { error } = await supabase.from('support_tickets').insert({ name, email, phone, order_number: orderNumber, subject, message });
    if (error) { toast.error("Failed to send. Please try again."); } else {
      toast.success("Message sent! We'll get back to you within 24 hours.");
      setName(""); setEmail(""); setPhone(""); setOrderNumber(""); setSubject(""); setMessage("");
    }
    setSending(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container py-8 md:py-12">
      <h1 className="font-heading text-2xl md:text-3xl font-bold mb-8">Contact Us</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label className="font-body">Full Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div className="space-y-2"><Label className="font-body">Email *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div className="space-y-2"><Label className="font-body">Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div className="space-y-2"><Label className="font-body">Order Number</Label><Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="ORD-2026-XXXXX" /></div>
              <div className="space-y-2"><Label className="font-body">Subject *</Label>
                <Select value={subject} onValueChange={setSubject}><SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label className="font-body">Message *</Label><Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} required /></div>
              <Button type="submit" className="w-full" disabled={sending}>{sending ? "Sending..." : "Send Message"}</Button>
            </form>
          </CardContent>
        </Card>
        <div className="space-y-6">
          {[
            { icon: MapPin, label: "Address", value: "Mumbai, Maharashtra, India" },
            { icon: Phone, label: "Phone", value: "+91 98765 43210" },
            { icon: Mail, label: "Email", value: "hello@elara.store" },
            { icon: Clock, label: "Business Hours", value: "Mon–Sat, 10 AM – 7 PM IST" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><item.icon className="h-5 w-5 text-primary" /></div>
              <div><p className="text-sm font-medium font-body">{item.label}</p><p className="text-sm text-muted-foreground font-body">{item.value}</p></div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default Contact;
