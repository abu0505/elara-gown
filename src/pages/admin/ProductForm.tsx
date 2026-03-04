import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { compressImageToWebP } from "@/utils/imageCompressor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Upload, X, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "@/stores/adminStore";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Free Size"];
const FIT_TYPES = ["Regular", "Slim", "Flared", "A-line", "Bodycon", "Straight"];
const OCCASIONS = ["Casual", "Formal", "Party", "Ethnic", "Wedding", "Daily Wear"];

interface ImageUpload {
  id?: string;
  file?: File;
  preview: string;
  sizeKB?: number;
  originalSizeKB?: number;
  compressionRatio?: string;
  status: "ready" | "compressing" | "uploading" | "done";
  storagePath?: string;
  publicUrl?: string;
}

interface ColorEntry {
  name: string;
  hex: string;
}

const ProductForm = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const admin = useAdminStore((s) => s.admin);
  const isEdit = !!productId;

  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [material, setMaterial] = useState("");
  const [fitType, setFitType] = useState("");
  const [occasion, setOccasion] = useState<string[]>([]);
  const [careInstructions, setCareInstructions] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);

  // Step 2
  const [basePrice, setBasePrice] = useState("");
  const [salePrice, setSalePrice] = useState("");

  // Step 3
  const [images, setImages] = useState<ImageUpload[]>([]);

  // Step 4
  const [colors, setColors] = useState<ColorEntry[]>([]);
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#C2185B");
  const [enabledSizes, setEnabledSizes] = useState<string[]>(["S", "M", "L", "XL"]);
  const [stockMatrix, setStockMatrix] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    supabase.from('categories').select('*').eq('is_active', true).then(({ data }) => setCategories(data || []));
    if (isEdit) loadProduct();
  }, []);

  const loadProduct = async () => {
    const { data: p } = await supabase.from('products').select('*').eq('id', productId).single();
    if (!p) return;
    setName(p.name); setSlug(p.slug); setCategoryId(p.category_id || "");
    setDescription(p.description || ""); setMaterial(p.material || "");
    setFitType(p.fit_type || ""); setOccasion(p.occasion || []);
    setCareInstructions(p.care_instructions || "");
    setIsActive(p.is_active ?? true); setIsFeatured(p.is_featured ?? false);
    setIsNewArrival(p.is_new_arrival ?? false); setIsBestSeller(p.is_best_seller ?? false);
    setBasePrice(String(p.base_price)); setSalePrice(p.sale_price ? String(p.sale_price) : "");

    // Load images
    const { data: imgs } = await supabase.from('product_images').select('*').eq('product_id', productId).order('sort_order');
    if (imgs) setImages(imgs.map(img => ({ id: img.id, preview: img.public_url, status: "done" as const, storagePath: img.storage_path, publicUrl: img.public_url })));

    // Load variants
    const { data: variants } = await supabase.from('product_variants').select('*').eq('product_id', productId);
    if (variants && variants.length > 0) {
      const colorMap = new Map<string, ColorEntry>();
      const sizeSet = new Set<string>();
      const matrix: Record<string, Record<string, number>> = {};
      variants.forEach(v => {
        colorMap.set(v.color_name, { name: v.color_name, hex: v.color_hex });
        sizeSet.add(v.size);
        if (!matrix[v.color_name]) matrix[v.color_name] = {};
        matrix[v.color_name][v.size] = v.stock_qty;
      });
      setColors(Array.from(colorMap.values()));
      setEnabledSizes(Array.from(sizeSet));
      setStockMatrix(matrix);
    }
  };

  const generateSlug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleNameChange = (v: string) => {
    setName(v);
    if (!isEdit) setSlug(generateSlug(v));
  };

  const handleImageUpload = async (files: FileList) => {
    for (const file of Array.from(files)) {
      const id = crypto.randomUUID();
      setImages(prev => [...prev, { preview: URL.createObjectURL(file), file, status: "compressing" }]);
      try {
        const compressed = await compressImageToWebP(file);
        setImages(prev => prev.map(img => img.file === file
          ? { ...img, preview: compressed.dataUrl, sizeKB: compressed.sizeKB, originalSizeKB: compressed.originalSizeKB, compressionRatio: compressed.compressionRatio, status: "ready", file: undefined }
          : img
        ));
        // Store blob for later upload
        (window as any)[`__blob_${id}`] = compressed.blob;
        setImages(prev => prev.map(img => img.preview === compressed.dataUrl ? { ...img, id } : img));
      } catch {
        toast.error(`Failed to compress ${file.name}`);
      }
    }
  };

  const addColor = () => {
    if (!newColorName.trim()) return;
    if (colors.some(c => c.name === newColorName)) return;
    setColors([...colors, { name: newColorName, hex: newColorHex }]);
    setNewColorName("");
  };

  const removeColor = (name: string) => {
    setColors(colors.filter(c => c.name !== name));
    const newMatrix = { ...stockMatrix };
    delete newMatrix[name];
    setStockMatrix(newMatrix);
  };

  const updateStock = (color: string, size: string, qty: number) => {
    setStockMatrix(prev => ({
      ...prev,
      [color]: { ...(prev[color] || {}), [size]: Math.max(0, qty) }
    }));
  };

  const handleSave = async () => {
    if (!name || !slug || !basePrice) { toast.error("Please fill required fields"); return; }
    setSaving(true);

    try {
      const productData = {
        name, slug, description, category_id: categoryId || null,
        base_price: Number(basePrice), sale_price: salePrice ? Number(salePrice) : null,
        material, fit_type: fitType, occasion, care_instructions: careInstructions,
        is_active: isActive, is_featured: isFeatured, is_new_arrival: isNewArrival, is_best_seller: isBestSeller,
        created_by: admin?.id,
      };

      let pId = productId;
      if (isEdit) {
        await supabase.from('products').update(productData).eq('id', productId);
      } else {
        const { data, error } = await supabase.from('products').insert(productData).select('id').single();
        if (error) throw error;
        pId = data.id;
      }

      // Upload new images
      for (const img of images.filter(i => i.status === "ready" && i.id)) {
        const blob = (window as any)[`__blob_${img.id}`];
        if (!blob) continue;
        const filename = `${crypto.randomUUID()}.webp`;
        const storagePath = `products/${pId}/${filename}`;
        const { error } = await supabase.storage.from('product-images').upload(storagePath, blob, { contentType: 'image/webp' });
        if (error) { console.error(error); continue; }
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(storagePath);
        await supabase.from('product_images').insert({ product_id: pId, storage_path: storagePath, public_url: publicUrl, width: 0, height: 0, size_bytes: blob.size });
        delete (window as any)[`__blob_${img.id}`];
      }

      // Save variants
      if (isEdit) {
        await supabase.from('product_variants').delete().eq('product_id', pId);
      }
      const variants: any[] = [];
      for (const color of colors) {
        for (const size of enabledSizes) {
          const qty = stockMatrix[color.name]?.[size] || 0;
          variants.push({
            product_id: pId, size, color_name: color.name, color_hex: color.hex,
            sku: `${slug}-${size}-${color.name}`.toLowerCase().replace(/\s+/g, '-'),
            stock_qty: qty,
          });
        }
      }
      if (variants.length > 0) {
        await supabase.from('product_variants').insert(variants);
      }

      toast.success(isEdit ? "Product updated!" : "Product created!");
      navigate("/admin/inventory");
    } catch (err: any) {
      toast.error(err.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const discountPercent = basePrice && salePrice && Number(salePrice) < Number(basePrice)
    ? Math.round(((Number(basePrice) - Number(salePrice)) / Number(basePrice)) * 100)
    : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/inventory")}><ArrowLeft className="h-4 w-4" /></Button>
        <h2 className="font-heading text-lg font-bold">{isEdit ? "Edit Product" : "Add New Product"}</h2>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map(s => (
          <button key={s} onClick={() => setStep(s)} className={`flex-1 h-2 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground font-body">Step {step} of 4 — {["Basic Info", "Pricing", "Images", "Variants"][step - 1]}</p>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="font-body">Product Name *</Label>
                <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Elegant Rose Maxi Dress" />
              </div>
              <div className="space-y-2">
                <Label className="font-body">Slug</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="elegant-rose-maxi-dress" />
              </div>
              <div className="space-y-2">
                <Label className="font-body">Category *</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-body">Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-body">Material</Label>
                  <Input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="Cotton Blend" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Fit Type</Label>
                  <Select value={fitType} onValueChange={setFitType}>
                    <SelectTrigger><SelectValue placeholder="Select fit" /></SelectTrigger>
                    <SelectContent>{FIT_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-body">Occasion</Label>
                <div className="flex flex-wrap gap-2">
                  {OCCASIONS.map(o => (
                    <button key={o} onClick={() => setOccasion(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o])}
                      className={`px-3 py-1 rounded-full text-xs border transition-colors font-body ${occasion.includes(o) ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-body">Care Instructions</Label>
                <Textarea value={careInstructions} onChange={(e) => setCareInstructions(e.target.value)} rows={2} />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between"><Label className="font-body">Active</Label><Switch checked={isActive} onCheckedChange={setIsActive} /></div>
                <div className="flex items-center justify-between"><Label className="font-body">Featured</Label><Switch checked={isFeatured} onCheckedChange={setIsFeatured} /></div>
                <div className="flex items-center justify-between"><Label className="font-body">New Arrival</Label><Switch checked={isNewArrival} onCheckedChange={setIsNewArrival} /></div>
                <div className="flex items-center justify-between"><Label className="font-body">Best Seller</Label><Switch checked={isBestSeller} onCheckedChange={setIsBestSeller} /></div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Pricing */}
      {step === 2 && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label className="font-body">Base / MRP Price (₹) *</Label>
              <Input type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="1999" />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Sale Price (₹)</Label>
              <Input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="1499" />
            </div>
            {discountPercent > 0 && (
              <Badge className="bg-success text-success-foreground">{discountPercent}% OFF</Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Images */}
      {step === 3 && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => document.getElementById('image-upload')?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-body text-muted-foreground">Click to upload images (max 6)</p>
              <p className="text-xs text-muted-foreground font-body">Auto-compressed to WebP &lt; 50KB</p>
              <input id="image-upload" type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && handleImageUpload(e.target.files)} />
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden border border-border">
                    <img src={img.preview} alt="" className="aspect-square object-cover w-full" />
                    {img.status === "compressing" && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                      </div>
                    )}
                    {img.sizeKB && (
                      <div className="absolute bottom-0 left-0 right-0 bg-background/90 px-2 py-1">
                        <p className="text-[10px] font-body text-muted-foreground">
                          {img.originalSizeKB}KB → {img.sizeKB}KB ({img.compressionRatio}) ✅
                        </p>
                      </div>
                    )}
                    <button onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                      <X className="h-3 w-3" />
                    </button>
                    {i === 0 && <Badge className="absolute top-1 left-1 text-[8px]">Cover</Badge>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Variants */}
      {step === 4 && (
        <Card>
          <CardContent className="space-y-6 pt-6">
            {/* Color management */}
            <div>
              <Label className="font-body mb-2 block">Colors</Label>
              <div className="flex gap-2 mb-3">
                <Input placeholder="Color name" value={newColorName} onChange={(e) => setNewColorName(e.target.value)} className="flex-1" />
                <input type="color" value={newColorHex} onChange={(e) => setNewColorHex(e.target.value)} className="h-9 w-12 rounded border border-border cursor-pointer" />
                <Button size="sm" onClick={addColor}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {colors.map(c => (
                  <Badge key={c.name} variant="secondary" className="gap-1 pr-1">
                    <div className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: c.hex }} />
                    <span className="font-body text-xs">{c.name}</span>
                    <button onClick={() => removeColor(c.name)}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Size selection */}
            <div>
              <Label className="font-body mb-2 block">Sizes</Label>
              <div className="flex flex-wrap gap-2">
                {SIZES.map(s => (
                  <button key={s} onClick={() => setEnabledSizes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors font-body ${enabledSizes.includes(s) ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Stock matrix */}
            {colors.length > 0 && enabledSizes.length > 0 && (
              <div>
                <Label className="font-body mb-2 block">Stock Matrix</Label>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm font-body">
                    <thead>
                      <tr>
                        <th className="text-left p-2 text-xs text-muted-foreground">Size \ Color</th>
                        {colors.map(c => (
                          <th key={c.name} className="p-2 text-xs text-center">
                            <div className="flex items-center justify-center gap-1">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: c.hex }} />
                              {c.name}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {enabledSizes.map(size => (
                        <tr key={size}>
                          <td className="p-2 font-medium">{size}</td>
                          {colors.map(color => (
                            <td key={color.name} className="p-2">
                              <Input
                                type="number"
                                min={0}
                                value={stockMatrix[color.name]?.[size] || 0}
                                onChange={(e) => updateStock(color.name, size, parseInt(e.target.value) || 0)}
                                className="w-16 h-8 text-center text-xs mx-auto"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}>Previous</Button>
        {step < 4 ? (
          <Button onClick={() => setStep(s => s + 1)}>Next</Button>
        ) : (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : (isEdit ? "Update Product" : "Save & Publish")}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProductForm;
