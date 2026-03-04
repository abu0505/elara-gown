import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Circle, Package, Search } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const STATUS_STEPS = ["pending", "confirmed", "processing", "shipped", "delivered"];

const OrderLookup = () => {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber || !phone) { toast.error("Both fields required"); return; }
    setLoading(true); setSearched(true);
    const { data: orderData } = await supabase.from('orders').select('*').eq('order_number', orderNumber.toUpperCase()).eq('customer_phone', phone).single();
    if (!orderData) { setOrder(null); setLoading(false); return; }
    setOrder(orderData);
    const { data: itemsData } = await supabase.from('order_items').select('*').eq('order_id', orderData.id);
    setItems(itemsData || []);
    const { data: historyData } = await supabase.from('order_status_history').select('*').eq('order_id', orderData.id).order('created_at', { ascending: true });
    setHistory(historyData || []);
    setLoading(false);
  };

  const currentStep = order ? STATUS_STEPS.indexOf(order.status) : -1;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container py-8 md:py-12 max-w-2xl">
      <h1 className="font-heading text-2xl md:text-3xl font-bold mb-8">Track Your Order</h1>
      <Card className="mb-8">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2"><Label className="font-body">Order Number</Label><Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="ORD-2026-XXXXX" required /></div>
            <div className="space-y-2"><Label className="font-body">Phone Number</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" required /></div>
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
            <CardHeader><CardTitle className="text-sm font-body flex items-center justify-between">{order.order_number}<Badge className="capitalize">{order.status}</Badge></CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 mb-6">
                {STATUS_STEPS.map((step, i) => (
                  <div key={step} className="flex items-center flex-1">
                    <div className={`flex flex-col items-center ${i <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}>
                      {i <= currentStep ? <CheckCircle className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                      <span className="text-[10px] mt-1 capitalize font-body">{step}</span>
                    </div>
                    {i < STATUS_STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${i < currentStep ? 'bg-primary' : 'bg-border'}`} />}
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="space-y-2 text-sm font-body">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    <img src={item.product_image} alt="" className="h-12 w-12 rounded object-cover" />
                    <div className="flex-1"><p className="font-medium">{item.product_name}</p><p className="text-xs text-muted-foreground">{item.size} / {item.color_name} × {item.quantity}</p></div>
                    <span>₹{Number(item.line_total).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="text-sm font-body text-right space-y-1">
                <p>Subtotal: ₹{Number(order.subtotal).toLocaleString()}</p>
                {Number(order.discount_amount) > 0 && <p className="text-success">Discount: -₹{Number(order.discount_amount).toLocaleString()}</p>}
                <p>Delivery: ₹{Number(order.delivery_charge).toLocaleString()}</p>
                <p className="font-bold text-lg">Total: ₹{Number(order.total_amount).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          {history.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-body">Status Timeline</CardTitle></CardHeader>
              <CardContent><div className="space-y-3">{history.map(h => (
                <div key={h.id} className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-success" />
                  <div><p className="text-sm font-body capitalize font-medium">{h.new_status}</p><p className="text-xs text-muted-foreground font-body">{new Date(h.created_at).toLocaleString('en-IN')}</p></div>
                </div>
              ))}</div></CardContent>
            </Card>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default OrderLookup;
