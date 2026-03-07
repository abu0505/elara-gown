import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Pencil, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "@/stores/adminStore";

const Coupons = () => {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const admin = useAdminStore((s) => s.admin);

  // Form state
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"flat" | "percent">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [maxCap, setMaxCap] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => { fetchCoupons(); }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    setCoupons(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setCode(""); setDescription(""); setDiscountType("percent"); setDiscountValue("");
    setMinOrder(""); setMaxCap(""); setUsageLimit(""); setIsActive(true); setEditId(null);
  };

  const openCreate = () => { resetForm(); setSheetOpen(true); };

  const openEdit = (coupon: any) => {
    setEditId(coupon.id); setCode(coupon.code); setDescription(coupon.description || "");
    setDiscountType(coupon.discount_type); setDiscountValue(String(coupon.discount_value));
    setMinOrder(coupon.min_order_amount ? String(coupon.min_order_amount) : "");
    setMaxCap(coupon.max_discount_cap ? String(coupon.max_discount_cap) : "");
    setUsageLimit(coupon.usage_limit ? String(coupon.usage_limit) : "");
    setIsActive(coupon.is_active); setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!code || !discountValue) { toast.error("Code and value required"); return; }
    const data: any = {
      code: code.toUpperCase(), description, discount_type: discountType,
      discount_value: Number(discountValue), min_order_amount: minOrder ? Number(minOrder) : 0,
      max_discount_cap: maxCap ? Number(maxCap) : null,
      usage_limit: usageLimit ? Number(usageLimit) : null, is_active: isActive,
      created_by: admin?.id,
    };
    if (editId) {
      await supabase.from('coupons').update(data).eq('id', editId);
      toast.success("Coupon updated");
    } else {
      await supabase.from('coupons').insert(data);
      toast.success("Coupon created");
    }
    setSheetOpen(false); resetForm(); fetchCoupons();
  };

  const deleteCoupon = async (id: string) => {
    await supabase.from('coupons').delete().eq('id', id);
    toast.success("Coupon deleted");
    fetchCoupons();
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) result += chars[Math.floor(Math.random() * chars.length)];
    setCode(result);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Create Coupon</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto"><Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-body text-xs">Code</TableHead>
                <TableHead className="font-body text-xs">Type</TableHead>
                <TableHead className="font-body text-xs">Value</TableHead>
                <TableHead className="font-body text-xs">Min Order</TableHead>
                <TableHead className="font-body text-xs">Usage</TableHead>
                <TableHead className="font-body text-xs">Status</TableHead>
                <TableHead className="font-body text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground font-body">Loading...</TableCell></TableRow>
              ) : coupons.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground font-body">No coupons yet</TableCell></TableRow>
              ) : coupons.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-sm font-medium">{c.code}</TableCell>
                  <TableCell className="font-body text-sm capitalize">{c.discount_type === 'flat' ? 'Flat ₹' : 'Percent %'}</TableCell>
                  <TableCell className="font-body text-sm">{c.discount_type === 'flat' ? `₹${c.discount_value}` : `${c.discount_value}%`}</TableCell>
                  <TableCell className="font-body text-sm">₹{Number(c.min_order_amount).toLocaleString()}</TableCell>
                  <TableCell className="font-body text-sm">{c.usage_count}/{c.usage_limit || '∞'}</TableCell>
                  <TableCell><Badge variant={c.is_active ? "secondary" : "destructive"} className="text-[10px]">{c.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Copied!"); }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteCoupon(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-body">{editId ? "Edit Coupon" : "Create Coupon"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label className="font-body">Coupon Code</Label>
              <div className="flex gap-2">
                <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SUMMER30" className="font-mono" />
                <Button variant="outline" size="sm" onClick={generateCode}>Generate</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-body">Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Internal note" />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Discount Type</Label>
              <Select value={discountType} onValueChange={(v: "flat" | "percent") => setDiscountType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                  <SelectItem value="percent">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-body">Discount Value</Label>
              <Input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder={discountType === 'flat' ? "200" : "30"} />
            </div>
            {discountType === 'percent' && (
              <div className="space-y-2">
                <Label className="font-body">Max Discount Cap (₹)</Label>
                <Input type="number" value={maxCap} onChange={(e) => setMaxCap(e.target.value)} placeholder="500" />
              </div>
            )}
            <div className="space-y-2">
              <Label className="font-body">Minimum Order Amount (₹)</Label>
              <Input type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="999" />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Usage Limit</Label>
              <Input type="number" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} placeholder="100 (empty = unlimited)" />
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-body">Active</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
            <Button className="w-full" onClick={handleSave}>{editId ? "Update" : "Create"} Coupon</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Coupons;
