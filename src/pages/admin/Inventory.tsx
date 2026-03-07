import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const Inventory = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*, categories(name), product_variants(stock_qty), product_images(public_url, is_primary, sort_order)')
      .order('created_at', { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('products').update({ is_active: !current }).eq('id', id);
    fetchProducts();
  };

  const deleteProduct = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', deleteId);
      if (error) throw error;
      toast.success("Product deleted successfully");
      setDeleteId(null);
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete product");
      setDeleteId(null);
    }
  };

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button asChild>
          <Link to="/admin/inventory/new"><Plus className="h-4 w-4 mr-1" /> Add Product</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto"><Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-body text-xs w-[60px]">Image</TableHead>
                <TableHead className="font-body text-xs">Product</TableHead>
                <TableHead className="font-body text-xs">Category</TableHead>
                <TableHead className="font-body text-xs">Price</TableHead>
                <TableHead className="font-body text-xs">Stock</TableHead>
                <TableHead className="font-body text-xs">Active</TableHead>
                <TableHead className="font-body text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground font-body">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground font-body">No products found</TableCell></TableRow>
              ) : filtered.map((product) => {
                const totalStock = (product.product_variants || []).reduce((sum: number, v: any) => sum + (v.stock_qty || 0), 0);
                const images = product.product_images || [];
                const primaryImage = images.find((i: any) => i.is_primary) || images.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))[0];
                const imageUrl = primaryImage?.public_url || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=100&q=80&fit=crop&auto=format";

                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <img src={imageUrl} alt={product.name} className="w-10 h-10 rounded object-cover border border-border" />
                    </TableCell>
                    <TableCell className="font-body text-sm">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{product.name}</div>
                        {product.is_new_arrival && <Badge variant="secondary" className="text-[10px]">NEW</Badge>}
                        {product.is_best_seller && <Badge variant="secondary" className="text-[10px]">BEST</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="font-body text-sm text-muted-foreground">{(product.categories as any)?.name || "—"}</TableCell>
                    <TableCell className="font-body text-sm">
                      {product.sale_price ? (
                        <div>
                          <span className="font-medium">₹{Number(product.sale_price).toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground line-through ml-1">₹{Number(product.base_price).toLocaleString()}</span>
                        </div>
                      ) : (
                        <span>₹{Number(product.base_price).toLocaleString()}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={totalStock === 0 ? "destructive" : totalStock <= 10 ? "secondary" : "secondary"} className="text-[10px]">
                        {totalStock}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch checked={product.is_active} onCheckedChange={() => toggleActive(product.id, product.is_active)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/admin/inventory/${product.id}/edit`}><Pencil className="h-4 w-4" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(product.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table></div>
        </CardContent>
      </Card>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-body">Delete Product?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground font-body">This will permanently delete the product and its associated data. This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={deleteProduct}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
