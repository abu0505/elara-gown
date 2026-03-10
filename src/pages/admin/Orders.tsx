import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Eye } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "#FFA726", confirmed: "#29B6F6", processing: "#AB47BC",
  shipped: "#26A69A", delivered: "#66BB6A", cancelled: "#EF5350",
  returned: "#8D6E63", refunded: "#78909C",
};

const STATUSES = ["all", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned", "refunded"];

const Orders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchOrders(); }, [statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50);
    if (statusFilter !== "all") query = query.eq('status', statusFilter);
    const { data } = await query;
    setOrders(data || []);
    setLoading(false);
  };

  const updateStatus = async (orderId: string, newStatus: string, oldStatus: string) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    await supabase.from('order_status_history').insert({ order_id: orderId, old_status: oldStatus, new_status: newStatus });
    fetchOrders();
  };

  const filtered = orders.filter(o => {
    const name = o.shipping_name ?? o.shipping_address?.name ?? '';
    const phone = o.customer_phone ?? o.shipping_address?.phone ?? '';
    return !search || o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      phone.includes(search);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s === "all" ? "All Statuses" : s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto"><Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-body text-xs">Order #</TableHead>
                <TableHead className="font-body text-xs">Customer</TableHead>
                <TableHead className="font-body text-xs">Total</TableHead>
                <TableHead className="font-body text-xs">Status</TableHead>
                <TableHead className="font-body text-xs">Payment</TableHead>
                <TableHead className="font-body text-xs">Date</TableHead>
                <TableHead className="font-body text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground font-body">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground font-body">No orders found</TableCell></TableRow>
              ) : filtered.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">{order.order_number}</TableCell>
                  <TableCell className="font-body text-sm">
                    <div>{order.shipping_name ?? order.shipping_address?.name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">{order.customer_phone ?? order.shipping_address?.phone ?? '—'}</div>
                  </TableCell>
                  <TableCell className="font-body text-sm">₹{Number(order.total_amount ?? order.total ?? 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <Select value={order.status} onValueChange={(v) => updateStatus(order.id, v, order.status)}>
                      <SelectTrigger className="h-7 w-[120px] text-xs">
                        <Badge variant="secondary" className="text-[10px] capitalize"
                          style={{ backgroundColor: STATUS_COLORS[order.status] + '20', color: STATUS_COLORS[order.status] }}>
                          {order.status}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.filter(s => s !== "all").map(s => <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px] capitalize">{order.payment_status}</Badge>
                  </TableCell>
                  <TableCell className="font-body text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString('en-IN')}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/admin/orders/${order.id}`}><Eye className="h-4 w-4" /></Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Orders;
