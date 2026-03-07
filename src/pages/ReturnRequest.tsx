import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Search, Package, ArrowRight, ArrowLeft, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const RETURN_REASONS = [
  "Size doesn't fit",
  "Received wrong item",
  "Damaged / defective",
  "Not as described",
  "Changed my mind",
];

const ReturnRequest = () => {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);

  // Step 1: Find order
  const [orderNumber, setOrderNumber] = useState(searchParams.get("order") || "");
  const [phone, setPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  // Step 2: Select items
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Step 3: Return details
  const [returnType, setReturnType] = useState<"return" | "exchange">("return");
  const [reason, setReason] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [exchangeSize, setExchangeSize] = useState("");

  // Step 4: Submitting
  const [submitting, setSubmitting] = useState(false);
  const [returnNumbers, setReturnNumbers] = useState<string[]>([]);

  const handleFindOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber || !phone) { toast.error("Both fields required"); return; }
    setSearching(true);

    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .eq("order_number", orderNumber.toUpperCase());

    const phoneClean = phone.replace(/\D/g, "").slice(-10);
    const matchedOrder = orders?.find(o => {
      const sp = (o.shipping_phone || "").replace(/\D/g, "").slice(-10);
      const cp = (o.customer_phone || "").replace(/\D/g, "").slice(-10);
      return sp === phoneClean || cp === phoneClean;
    });

    if (!matchedOrder) {
      toast.error("Order not found. Check your order number and phone.");
      setSearching(false);
      return;
    }

    if (matchedOrder.status !== "delivered") {
      toast.error("Returns can only be initiated for delivered orders.");
      setSearching(false);
      return;
    }

    setOrder(matchedOrder);
    const { data: itemsData } = await supabase.from("order_items").select("*").eq("order_id", matchedOrder.id);
    setItems(itemsData || []);
    setSelectedItemIds((itemsData || []).map((i: any) => i.id));
    setSearching(false);
    setStep(2);
  };

  const handleSubmitReturn = async () => {
    if (!reason) { toast.error("Please select a reason"); return; }
    if (selectedItemIds.length === 0) { toast.error("Please select at least one item"); return; }
    setSubmitting(true);

    const { data, error } = await supabase.functions.invoke("create-return-request", {
      body: {
        orderId: order.id,
        phone,
        items: selectedItemIds,
        returnType,
        reason,
        reasonDetail: reasonDetail.trim() || null,
        exchangeSize: returnType === "exchange" ? exchangeSize : null,
      },
    });

    setSubmitting(false);

    if (error || !data?.success) {
      toast.error(data?.message || "Failed to submit return request");
      return;
    }

    setReturnNumbers(data.returnIds || []);
    setStep(4);
  };

  const toggleItem = (itemId: string) => {
    setSelectedItemIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container py-8 md:py-12 max-w-2xl">
      <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">Return / Exchange Request</h1>
      <p className="text-sm text-muted-foreground font-body mb-8">Follow the steps below to initiate a return or exchange.</p>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {["Find Order", "Select Items", "Details", "Done"].map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold font-body ${step > i + 1 ? "bg-success text-success-foreground" : step === i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {step > i + 1 ? <CheckCircle className="h-4 w-4" /> : i + 1}
            </div>
            <span className="text-xs font-body hidden md:inline">{label}</span>
            {i < 3 && <div className={`flex-1 h-0.5 ${step > i + 1 ? "bg-success" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Find Order */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-body flex items-center gap-2"><Search className="h-4 w-4" /> Find Your Order</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleFindOrder} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-body">Order Number</Label>
                <Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="ORD-2026-XXXXX" required />
              </div>
              <div className="space-y-2">
                <Label className="font-body">Phone Number</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" required />
              </div>
              <Button type="submit" className="w-full" disabled={searching}>
                {searching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                Find Order
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Items */}
      {step === 2 && order && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-body flex items-center gap-2"><Package className="h-4 w-4" /> Select Items to Return</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground font-body">Order: <span className="font-mono font-medium">{order.order_number}</span></p>
            <div className="space-y-3">
              {items.map((item: any) => (
                <label key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors">
                  <Checkbox checked={selectedItemIds.includes(item.id)} onCheckedChange={() => toggleItem(item.id)} />
                  <img src={item.product_image} alt="" className="h-12 w-12 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium font-body truncate">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground font-body">{item.size} / {item.color_name} × {item.quantity}</p>
                  </div>
                  <span className="text-sm font-body">₹{Number(item.line_total).toLocaleString()}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
              <Button className="flex-1" onClick={() => setStep(3)} disabled={selectedItemIds.length === 0}>
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Return details */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-body flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Return Details</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="font-body text-sm mb-2 block">Request Type</Label>
              <RadioGroup value={returnType} onValueChange={(v) => setReturnType(v as "return" | "exchange")}>
                <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="return" /><span className="text-sm font-body">Return & Refund</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="exchange" /><span className="text-sm font-body">Exchange (different size)</span></label>
              </RadioGroup>
            </div>

            {returnType === "exchange" && (
              <div className="space-y-2">
                <Label className="font-body text-sm">Desired Size</Label>
                <Input value={exchangeSize} onChange={(e) => setExchangeSize(e.target.value)} placeholder="e.g., M, L, XL" />
              </div>
            )}

            <div>
              <Label className="font-body text-sm mb-2 block">Reason *</Label>
              <RadioGroup value={reason} onValueChange={setReason}>
                {RETURN_REASONS.map(r => (
                  <label key={r} className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value={r} />
                    <span className="text-sm font-body">{r}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="font-body text-sm">Additional Details (optional)</Label>
              <Textarea value={reasonDetail} onChange={(e) => setReasonDetail(e.target.value)} placeholder="Any additional information..." rows={3} />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
              <Button className="flex-1" onClick={handleSubmitReturn} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Submit Return Request
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Success */}
      {step === 4 && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-success mx-auto flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-success-foreground" />
            </div>
            <h2 className="font-heading text-xl font-bold mb-2">Return Request Submitted!</h2>
            <p className="text-sm text-muted-foreground font-body mb-6">
              Our team will review your request and contact you within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild><Link to="/products">Continue Shopping</Link></Button>
              <Button variant="outline" asChild><Link to="/account/orders">Track Your Order</Link></Button>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};

export default ReturnRequest;
