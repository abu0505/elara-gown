import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  pending: "#FFA726", confirmed: "#29B6F6", processing: "#AB47BC",
  shipped: "#26A69A", delivered: "#66BB6A", cancelled: "#EF5350",
  returned: "#8D6E63", refunded: "#78909C",
};

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned", "refunded"];

const OrderDetail = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [adminNote, setAdminNote] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (orderId) fetchOrder(); }, [orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    const { data: orderData } = await supabase.from('orders').select('*').eq('id', orderId).single();
    const { data: itemsData } = await supabase.from('order_items').select('*').eq('order_id', orderId);
    const { data: historyData } = await supabase.from('order_status_history').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
    setOrder(orderData);
    setItems(itemsData || []);
    setHistory(historyData || []);
    setAdminNote(orderData?.admin_note || "");
    setLoading(false);
  };

  const updateStatus = async (newStatus: string) => {
    if (!order) return;
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    await supabase.from('order_status_history').insert({ order_id: orderId, old_status: order.status, new_status: newStatus });
    toast.success(`Status updated to ${newStatus}`);
    fetchOrder();
  };

  const saveNote = async () => {
    await supabase.from('orders').update({ admin_note: adminNote }).eq('id', orderId);
    toast.success("Note saved");
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!order) return <div className="text-center py-20 font-body">Order not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/admin/orders"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h2 className="font-heading text-lg font-bold">{order.order_number}</h2>
          <p className="text-xs text-muted-foreground font-body">{new Date(order.created_at).toLocaleString('en-IN')}</p>
        </div>
        <Badge className="ml-auto capitalize" style={{ backgroundColor: STATUS_COLORS[order.status] + '20', color: STATUS_COLORS[order.status] }}>
          {order.status}
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Status update */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-body">Update Status</CardTitle></CardHeader>
          <CardContent>
            <Select value={order.status} onValueChange={updateStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Customer info */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-body">Customer</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm font-body">
            <p className="font-medium">{order.shipping_name}</p>
            <p className="text-muted-foreground">{order.customer_email}</p>
            <p className="text-muted-foreground">{order.customer_phone}</p>
          </CardContent>
        </Card>

        {/* Shipping */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-body">Shipping Address</CardTitle></CardHeader>
          <CardContent className="text-sm font-body text-muted-foreground">
            <p>{order.shipping_address1}</p>
            {order.shipping_address2 && <p>{order.shipping_address2}</p>}
            {order.shipping_landmark && <p>Landmark: {order.shipping_landmark}</p>}
            <p>{order.shipping_city}, {order.shipping_state} — {order.shipping_pincode}</p>
          </CardContent>
        </Card>
      </div>

      {/* Status timeline */}
      {history.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-body">Status Timeline</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((h, i) => (
                <div key={h.id} className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-success" />
                  <div>
                    <p className="text-sm font-body">
                      <span className="capitalize font-medium">{h.new_status}</span>
                      {h.old_status && <span className="text-muted-foreground"> from {h.old_status}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground font-body">{new Date(h.created_at).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-body">Order Items</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto"><Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-body text-xs">Product</TableHead>
                <TableHead className="font-body text-xs">Size</TableHead>
                <TableHead className="font-body text-xs">Color</TableHead>
                <TableHead className="font-body text-xs">Qty</TableHead>
                <TableHead className="font-body text-xs">Price</TableHead>
                <TableHead className="font-body text-xs">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-body text-sm">
                    <div className="flex items-center gap-2">
                      <img src={item.product_image} alt="" className="h-10 w-10 rounded object-cover" />
                      {item.product_name}
                    </div>
                  </TableCell>
                  <TableCell className="font-body text-sm">{item.size}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <div className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: item.color_hex }} />
                      <span className="text-xs font-body">{item.color_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-body text-sm">{item.quantity}</TableCell>
                  <TableCell className="font-body text-sm">₹{Number(item.unit_price).toLocaleString()}</TableCell>
                  <TableCell className="font-body text-sm font-medium">₹{Number(item.line_total).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div>
          <Separator className="my-4" />
          <div className="space-y-1 text-sm font-body text-right">
            <p>Subtotal: ₹{Number(order.subtotal).toLocaleString()}</p>
            {Number(order.discount_amount) > 0 && <p className="text-success">Discount: -₹{Number(order.discount_amount).toLocaleString()}</p>}
            <p>Delivery: ₹{Number(order.delivery_charge).toLocaleString()}</p>
            <p className="text-lg font-bold">Total: ₹{Number(order.total_amount).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      {/* Admin notes */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-body">Admin Notes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Add internal notes..." className="font-body" />
          <Button size="sm" onClick={saveNote}>Save Note</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderDetail;
