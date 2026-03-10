import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, Circle, Package, Search, XCircle, RefreshCw, AlertCircle, Truck, Home, ShoppingBag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const STATUS_STEPS = [
  { key: "pending", label: "Order Placed", icon: ShoppingBag },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "processing", label: "Processing", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
];

const CANCEL_REASONS = [
  "Ordered by mistake",
  "Found a better price",
  "Changed my mind",
  "Delivery time too long",
  "Other",
];

const RETURN_REASONS = [
  "Size doesn't fit",
  "Received wrong item",
  "Damaged / defective",
  "Not as described",
  "Changed my mind",
];

const OrderLookup = () => {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelOther, setCancelOther] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Return dialog
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnType, setReturnType] = useState<"return" | "exchange">("return");
  const [returning, setReturning] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber || !phone) { toast.error("Both fields required"); return; }
    setLoading(true); setSearched(true);

    // Query matching order_number and either shipping_phone or customer_phone
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber.toUpperCase());

    const phoneClean = phone.replace(/\D/g, "").slice(-10);
    const matchedOrder = orders?.find(o => {
      const sp = (o.shipping_phone || "").replace(/\D/g, "").slice(-10);
      const cp = (o.customer_phone || "").replace(/\D/g, "").slice(-10);
      return sp === phoneClean || cp === phoneClean;
    });

    if (!matchedOrder) { setOrder(null); setLoading(false); return; }
    setOrder(matchedOrder);

    const { data: itemsData } = await supabase.from('order_items').select('*').eq('order_id', matchedOrder.id);
    setItems(itemsData || []);
    const { data: historyData } = await supabase.from('order_status_history').select('*').eq('order_id', matchedOrder.id).order('created_at', { ascending: true });
    setHistory(historyData || []);
    setLoading(false);
  };

  const currentStep = order ? STATUS_STEPS.findIndex(s => s.key === order.status) : -1;
  const canCancel = order && ["pending", "confirmed"].includes(order.status);

  const canReturn = order && order.status === "delivered" && (() => {
    const deliveredEntry = history.find(h => h.new_status === "delivered");
    if (!deliveredEntry) return false;
    const days = (Date.now() - new Date(deliveredEntry.created_at).getTime()) / (1000 * 60 * 60 * 24);
    return days <= 7;
  })();

  const handleCancel = async () => {
    if (!cancelReason) { toast.error("Please select a reason"); return; }
    setCancelling(true);
    const reason = cancelReason === "Other" ? cancelOther || "Other" : cancelReason;

    const { data, error } = await supabase.functions.invoke('cancel-order', {
      body: { orderId: order.id, phone, reason },
    });

    setCancelling(false);
    if (error || !data?.success) {
      toast.error(data?.message || "Failed to cancel order");
      return;
    }

    toast.success("Order cancelled successfully");
    setCancelOpen(false);
    // Refresh
    setOrder({ ...order, status: "cancelled" });
    setHistory([...history, { id: Date.now(), new_status: "cancelled", old_status: order.status, created_at: new Date().toISOString(), note: `Cancelled: ${reason}` }]);
  };

  const handleReturn = async () => {
    if (!returnReason) { toast.error("Please select a reason"); return; }
    setReturning(true);

    const { data, error } = await supabase.functions.invoke('create-return-request', {
      body: {
        orderId: order.id,
        phone,
        reason: returnReason,
        returnType,
        items: items.map(i => i.id),
      },
    });

    setReturning(false);
    if (error || !data?.success) {
      toast.error(data?.message || "Failed to submit return request");
      return;
    }

    toast.success("Return request submitted! Our team will contact you within 24 hours.");
    setReturnOpen(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container py-8 md:py-12 max-w-2xl">
      <h1 className="font-heading text-2xl md:text-3xl font-bold mb-8">Track Your Order</h1>
      <Card className="mb-8">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2"><Label className="font-body">Order Number</Label><Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="ORD-2026-XXXXX" required /></div>
            <div className="space-y-2"><Label className="font-body">Phone Number</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" required /></div>
            <Button type="submit" className="w-full" disabled={loading}><Search className="h-4 w-4 mr-2" /> {loading ? "Searching..." : "Track Order"}</Button>
          </form>
        </CardContent>
      </Card>

      {searched && !order && !loading && (
        <Card><CardContent className="p-8 text-center"><Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="font-body text-muted-foreground">No order found. Please check your order number and phone number.</p></CardContent></Card>
      )}

      {order && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm font-body flex items-center justify-between"><span className="font-mono">{order.order_number}</span><Badge className="capitalize">{order.status}</Badge></CardTitle></CardHeader>
            <CardContent>
              {/* Status Timeline */}
              {order.status !== "cancelled" && order.status !== "returned" && (
                <div className="flex items-center gap-1 mb-6">
                  {STATUS_STEPS.map((step, i) => (
                    <div key={step.key} className="flex items-center flex-1">
                      <div className={`flex flex-col items-center ${i <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}>
                        {i <= currentStep ? <step.icon className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                        <span className="text-[10px] mt-1 capitalize font-body">{step.label}</span>
                      </div>
                      {i < STATUS_STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${i < currentStep ? 'bg-primary' : 'bg-border'}`} />}
                    </div>
                  ))}
                </div>
              )}

              {order.status === "cancelled" && (
                <div className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <p className="text-sm font-body text-destructive font-medium">This order has been cancelled</p>
                </div>
              )}

              <Separator className="my-4" />
              <div className="space-y-2 text-sm font-body">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1"><p className="font-medium">{item.product_name}</p><p className="text-xs text-muted-foreground">{item.variant_name || ''} × {item.quantity}</p></div>
                    <span>₹{Number(item.total_price || (item.unit_price * item.quantity)).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="text-sm font-body text-right space-y-1">
                <p>Subtotal: ₹{Number(order.subtotal || 0).toLocaleString()}</p>
                {Number(order.discount_amount ?? order.discount ?? 0) > 0 && <p className="text-success">Discount: -₹{Number(order.discount_amount ?? order.discount ?? 0).toLocaleString()}</p>}
                <p>Delivery: ₹{Number(order.delivery_charge ?? order.shipping_cost ?? 0).toLocaleString()}</p>
                <p className="font-bold text-lg">Total: ₹{Number(order.total_amount ?? order.total ?? 0).toLocaleString()}</p>
              </div>

              {/* Action buttons */}
              {(canCancel || canReturn) && (
                <div className="flex gap-3 mt-6">
                  {canCancel && (
                    <Button variant="outline" className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => setCancelOpen(true)}>
                      <XCircle className="h-4 w-4 mr-2" /> Cancel Order
                    </Button>
                  )}
                  {canReturn && (
                    <Button variant="outline" className="flex-1" onClick={() => setReturnOpen(true)}>
                      <RefreshCw className="h-4 w-4 mr-2" /> Return / Exchange
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {history.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-body">Status Timeline</CardTitle></CardHeader>
              <CardContent><div className="space-y-3">{history.map(h => (
                <div key={h.id} className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-success" />
                  <div>
                    <p className="text-sm font-body capitalize font-medium">{h.new_status}</p>
                    {h.note && <p className="text-xs text-muted-foreground font-body">{h.note}</p>}
                    <p className="text-xs text-muted-foreground font-body">{new Date(h.created_at).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}</div></CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Cancel Order Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2"><AlertCircle className="h-5 w-5 text-destructive" /> Cancel this order?</DialogTitle>
          </DialogHeader>
          <p className="text-sm font-body text-muted-foreground font-mono">{order?.order_number}</p>
          <div className="space-y-3">
            <Label className="font-body text-sm">Reason for cancellation:</Label>
            <RadioGroup value={cancelReason} onValueChange={setCancelReason}>
              {CANCEL_REASONS.map(r => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value={r} />
                  <span className="text-sm font-body">{r}</span>
                </label>
              ))}
            </RadioGroup>
            {cancelReason === "Other" && (
              <Input placeholder="Please specify..." value={cancelOther} onChange={(e) => setCancelOther(e.target.value)} />
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep Order</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
              Cancel Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2"><RefreshCw className="h-5 w-5 text-primary" /> Return or Exchange</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-body text-sm mb-2 block">Request type:</Label>
              <RadioGroup value={returnType} onValueChange={(v) => setReturnType(v as "return" | "exchange")}>
                <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="return" /><span className="text-sm font-body">Return & Refund</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="exchange" /><span className="text-sm font-body">Exchange (different size)</span></label>
              </RadioGroup>
            </div>
            <div>
              <Label className="font-body text-sm mb-2 block">Reason:</Label>
              <RadioGroup value={returnReason} onValueChange={setReturnReason}>
                {RETURN_REASONS.map(r => (
                  <label key={r} className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value={r} /><span className="text-sm font-body">{r}</span></label>
                ))}
              </RadioGroup>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReturnOpen(false)}>Cancel</Button>
            <Button onClick={handleReturn} disabled={returning}>
              {returning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Submit Return Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default OrderLookup;
