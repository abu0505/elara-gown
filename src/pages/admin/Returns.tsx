import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RefreshCw, Search, Eye, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import InitiateReturnDialog from "@/components/admin/InitiateReturnDialog";

const STATUS_COLORS: Record<string, string> = {
  requested: "#FFA726",
  approved: "#29B6F6",
  picked_up: "#AB47BC",
  refunded: "#66BB6A",
  exchanged: "#26A69A",
  rejected: "#EF5350",
};

const RETURN_STATUSES = ["requested", "approved", "picked_up", "refunded", "exchanged", "rejected"];

const AdminReturns = () => {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const [initiateOpen, setInitiateOpen] = useState(false);

  useEffect(() => { fetchReturns(); }, []);

  const fetchReturns = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("return_requests")
      .select(`
        *,
        order:orders(order_number, shipping_name, customer_phone, customer_email),
        order_item:order_items(product_name, product_image, size, color_name, quantity, line_total)
      `)
      .order("created_at", { ascending: false });
    setReturns(data || []);
    setLoading(false);
  };

  const openDetail = (ret: any) => {
    setSelectedReturn(ret);
    setAdminNote(ret.admin_note || "");
    setDetailOpen(true);
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!selectedReturn) return;
    setUpdating(true);
    await supabase
      .from("return_requests")
      .update({ status: newStatus, admin_note: adminNote, updated_at: new Date().toISOString() })
      .eq("id", selectedReturn.id);
    setUpdating(false);
    toast.success(`Return status updated to ${newStatus}`);
    setDetailOpen(false);
    fetchReturns();
  };

  const filtered = searchQuery
    ? returns.filter(r =>
        (r.return_number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.order?.order_number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.order?.shipping_name || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : returns;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold">Return Requests</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchReturns}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setInitiateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Return
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by return #, order #, or name..."
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-body text-muted-foreground">No return requests found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-body text-xs">Return #</TableHead>
                    <TableHead className="font-body text-xs">Order</TableHead>
                    <TableHead className="font-body text-xs">Customer</TableHead>
                    <TableHead className="font-body text-xs">Type</TableHead>
                    <TableHead className="font-body text-xs">Reason</TableHead>
                    <TableHead className="font-body text-xs">Status</TableHead>
                    <TableHead className="font-body text-xs">Date</TableHead>
                    <TableHead className="font-body text-xs"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((ret) => (
                    <TableRow key={ret.id}>
                      <TableCell className="font-body text-sm font-mono">{ret.return_number || "—"}</TableCell>
                      <TableCell className="font-body text-sm font-mono">{ret.order?.order_number || "—"}</TableCell>
                      <TableCell className="font-body text-sm">{ret.order?.shipping_name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">{ret.return_type}</Badge>
                      </TableCell>
                      <TableCell className="font-body text-sm max-w-[150px] truncate">{ret.reason}</TableCell>
                      <TableCell>
                        <Badge
                          className="capitalize text-xs"
                          style={{
                            backgroundColor: (STATUS_COLORS[ret.status] || "#78909C") + "20",
                            color: STATUS_COLORS[ret.status] || "#78909C",
                          }}
                        >
                          {ret.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-body text-xs text-muted-foreground">
                        {new Date(ret.created_at).toLocaleDateString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => openDetail(ret)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Return Details
            </DialogTitle>
          </DialogHeader>
          {selectedReturn && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm font-body">
                <div>
                  <p className="text-xs text-muted-foreground">Return #</p>
                  <p className="font-mono font-medium">{selectedReturn.return_number || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Order #</p>
                  <p className="font-mono font-medium">{selectedReturn.order?.order_number || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p>{selectedReturn.order?.shipping_name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <Badge variant="outline" className="capitalize">{selectedReturn.return_type}</Badge>
                </div>
              </div>

              {selectedReturn.order_item && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <img src={selectedReturn.order_item.product_image} alt="" className="h-12 w-12 rounded object-cover" />
                  <div>
                    <p className="text-sm font-medium font-body">{selectedReturn.order_item.product_name}</p>
                    <p className="text-xs text-muted-foreground font-body">{selectedReturn.order_item.size} / {selectedReturn.order_item.color_name}</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground font-body">Reason</p>
                <p className="text-sm font-body">{selectedReturn.reason}</p>
                {selectedReturn.reason_detail && <p className="text-xs text-muted-foreground font-body mt-1">{selectedReturn.reason_detail}</p>}
              </div>

              {selectedReturn.exchange_size && (
                <div>
                  <p className="text-xs text-muted-foreground font-body">Exchange Size</p>
                  <p className="text-sm font-body">{selectedReturn.exchange_size}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground font-body mb-1">Update Status</p>
                <Select value={selectedReturn.status} onValueChange={handleStatusUpdate}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RETURN_STATUSES.map(s => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-xs text-muted-foreground font-body mb-1">Admin Note</p>
                <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Internal notes..." className="font-body" />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                <Button onClick={() => handleStatusUpdate(selectedReturn.status)} disabled={updating}>
                  {updating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Save Note
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReturns;
