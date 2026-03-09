import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Search, ArrowLeft, Loader2, Package, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface InitiateReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Step = "search" | "select" | "reason";

const InitiateReturnDialog = ({ open, onOpenChange, onSuccess }: InitiateReturnDialogProps) => {
  const [step, setStep] = useState<Step>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [returnType, setReturnType] = useState("return");
  const [exchangeSize, setExchangeSize] = useState("");
  const [reason, setReason] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep("search");
    setSearchQuery("");
    setOrders([]);
    setSelectedOrder(null);
    setOrderItems([]);
    setSelectedItems([]);
    setReturnType("return");
    setExchangeSize("");
    setReason("");
    setAdminNote("");
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const q = searchQuery.trim().toLowerCase();

    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "delivered")
      .or(`shipping_name.ilike.%${q}%,customer_phone.ilike.%${q}%,order_number.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(20);

    setOrders(data || []);
    setSearching(false);
  };

  const selectOrder = async (order: any) => {
    setSelectedOrder(order);
    const { data } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);
    setOrderItems(data || []);
    setSelectedItems([]);
    setStep("select");
  };

  const toggleItem = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please enter a reason for the return");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Please select at least one item");
      return;
    }

    setSubmitting(true);
    try {
      // Insert a return request for each selected item
      for (const itemId of selectedItems) {
        const { error } = await supabase.from("return_requests").insert({
          order_id: selectedOrder.id,
          order_item_id: itemId,
          reason,
          reason_detail: adminNote || null,
          return_type: returnType,
          exchange_size: returnType === "exchange" ? exchangeSize || null : null,
          admin_note: `Initiated by admin. ${adminNote}`.trim(),
          status: "requested",
        });
        if (error) throw error;
      }

      // Update order status
      await supabase
        .from("orders")
        .update({ status: "returned", updated_at: new Date().toISOString() })
        .eq("id", selectedOrder.id);

      // Add status history
      await supabase.from("order_status_history").insert({
        order_id: selectedOrder.id,
        old_status: selectedOrder.status,
        new_status: "returned",
        note: `Return initiated by admin. Reason: ${reason}`,
      });

      toast.success("Return request created successfully");
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to create return request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <SheetContent className="sm:max-w-lg w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-heading flex items-center gap-2">
            {step !== "search" && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStep(step === "reason" ? "select" : "search")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {step === "search" && "Search Customer Order"}
            {step === "select" && "Select Items to Return"}
            {step === "reason" && "Return Details"}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Step 1: Search */}
          {step === "search" && (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Name, phone, or order #..."
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch} disabled={searching} size="sm">
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground font-body">
                Showing delivered orders only
              </p>

              {orders.length === 0 && searchQuery && !searching && (
                <p className="text-sm text-muted-foreground font-body text-center py-8">
                  No delivered orders found
                </p>
              )}

              <div className="space-y-2">
                {orders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => selectOrder(order)}
                    className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-medium">{order.order_number}</span>
                      <span className="text-xs text-muted-foreground font-body">
                        {new Date(order.created_at).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                    <p className="text-sm font-body mt-1">{order.shipping_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground font-body">{order.customer_phone || order.customer_email || "—"}</span>
                      <span className="text-xs font-body font-medium">₹{Number(order.total_amount).toLocaleString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 2: Select Items */}
          {step === "select" && selectedOrder && (
            <>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-mono text-sm font-medium">{selectedOrder.order_number}</p>
                <p className="text-sm font-body">{selectedOrder.shipping_name} — ₹{Number(selectedOrder.total_amount).toLocaleString()}</p>
              </div>

              <p className="text-xs text-muted-foreground font-body">Select items to return:</p>

              <div className="space-y-2">
                {orderItems.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => toggleItem(item.id)}
                    />
                    <img src={item.product_image} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-body font-medium truncate">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground font-body">
                        {item.size} / {item.color_name} × {item.quantity} — ₹{Number(item.line_total).toLocaleString()}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-body">Return Type</Label>
                <RadioGroup value={returnType} onValueChange={setReturnType} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="return" id="rt-return" />
                    <Label htmlFor="rt-return" className="font-body text-sm">Return & Refund</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="exchange" id="rt-exchange" />
                    <Label htmlFor="rt-exchange" className="font-body text-sm">Exchange</Label>
                  </div>
                </RadioGroup>
              </div>

              {returnType === "exchange" && (
                <div>
                  <Label className="text-xs font-body">Exchange Size</Label>
                  <Input
                    value={exchangeSize}
                    onChange={(e) => setExchangeSize(e.target.value)}
                    placeholder="e.g., L, XL, 42..."
                    className="mt-1"
                  />
                </div>
              )}

              <Button
                onClick={() => setStep("reason")}
                disabled={selectedItems.length === 0}
                className="w-full"
              >
                Continue — {selectedItems.length} item(s) selected
              </Button>
            </>
          )}

          {/* Step 3: Reason & Submit */}
          {step === "reason" && (
            <>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-mono text-sm font-medium">{selectedOrder.order_number}</p>
                <p className="text-xs text-muted-foreground font-body">
                  {selectedItems.length} item(s) — {returnType === "exchange" ? "Exchange" : "Return & Refund"}
                </p>
              </div>

              <div>
                <Label className="text-xs font-body">Reason for Return *</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Customer's reason for returning..."
                  className="mt-1 font-body"
                  rows={3}
                />
              </div>

              <div>
                <Label className="text-xs font-body">Admin Note (internal)</Label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Any internal notes..."
                  className="mt-1 font-body"
                  rows={2}
                />
              </div>

              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Submit Return Request
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default InitiateReturnDialog;
