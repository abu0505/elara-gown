import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { compressImageToWebP } from "@/utils/imageCompressor";
import { uploadToCloudinary } from "@/utils/cloudinaryUpload";

const blobStore = new Map<string, Blob>();
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Upload, X, Plus, Trash2, Edit, ImageIcon, Tag, Palette, Save, Eye } from "lucide-react";
import ColorPickerPopover from "@/components/admin/ColorPickerPopover";
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
  colorHex?: string | null;  // NEW — which color this image belongs to
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

  const [categories, setCategories] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [showNewCatDialog, setShowNewCatDialog] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatImageFile, setNewCatImageFile] = useState<File | null>(null);
  const [newCatImagePreview, setNewCatImagePreview] = useState<string>("");
  const [creatingCat, setCreatingCat] = useState(false);
  const [deletingCat, setDeletingCat] = useState(false);

  const [showEditCatDialog, setShowEditCatDialog] = useState(false);
  const [editCatImageFile, setEditCatImageFile] = useState<File | null>(null);
  const [editCatImagePreview, setEditCatImagePreview] = useState<string>("");
  const [updatingCat, setUpdatingCat] = useState(false);

  // Basic Info
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

  // Pricing
  const [basePrice, setBasePrice] = useState("");
  const [salePrice, setSalePrice] = useState("");

  // Images
  const [thumbnail, setThumbnail] = useState<ImageUpload | null>(null);
  const [galleryImages, setGalleryImages] = useState<ImageUpload[]>([]);

  // Variants
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

    const { data: imgs } = await supabase.from('product_images').select('*').eq('product_id', productId).order('sort_order');
    if (imgs) {
      const primaryImg = imgs.find(img => img.is_primary);
      const galleryImgs = imgs.filter(img => !img.is_primary);
      if (primaryImg) {
        setThumbnail({ id: primaryImg.id, preview: primaryImg.public_url, status: "done", storagePath: primaryImg.storage_path, publicUrl: primaryImg.public_url, colorHex: primaryImg.color_hex || null });
      }
      setGalleryImages(galleryImgs.map(img => ({ id: img.id, preview: img.public_url, status: "done" as const, storagePath: img.storage_path, publicUrl: img.public_url, colorHex: img.color_hex || null })));
    }

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

  const handleCategoryChange = (value: string) => {
    if (value === "__new__") setShowNewCatDialog(true);
    else setCategoryId(value);
  };

  const handleCatImageSelect = async (file: File) => {
    setNewCatImageFile(file);
    setNewCatImagePreview(URL.createObjectURL(file));
  };

  const handleCreateCategory = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (!newCatImageFile) { toast.error("Please upload a category image"); return; }
    setCreatingCat(true);
    try {
      const slug = generateSlug(trimmed);
      const compressed = await compressImageToWebP(newCatImageFile);
      const cloudResult = await uploadToCloudinary(compressed.blob);
      const { data, error } = await supabase.from('categories').insert({ name: trimmed, slug, is_active: true, image_url: cloudResult.secure_url }).select('id').single();
      if (error) throw error;
      const { data: cats } = await supabase.from('categories').select('*').eq('is_active', true);
      setCategories(cats || []); setCategoryId(data.id);
      setNewCatName(""); setNewCatImageFile(null); setNewCatImagePreview(""); setShowNewCatDialog(false);
      toast.success(`Category "${trimmed}" created!`);
    } catch (err: any) { toast.error(err.message || "Failed to create category"); } finally { setCreatingCat(false); }
  };

  const handleDeleteCategory = async () => {
    if (!categoryId) return;
    const catToDelete = categories.find(c => c.id === categoryId);
    if (!catToDelete) return;
    if (!window.confirm(`Delete "${catToDelete.name}"?\nProducts will become uncategorized.`)) return;
    setDeletingCat(true);
    try {
      const { error } = await supabase.from('categories').delete().eq('id', categoryId);
      if (error) throw error;
      toast.success(`Category "${catToDelete.name}" deleted`); setCategoryId("");
      const { data: cats } = await supabase.from('categories').select('*').eq('is_active', true);
      setCategories(cats || []);
    } catch (err: any) { toast.error(err.message || "Failed to delete category"); } finally { setDeletingCat(false); }
  };

  const openEditCatDialog = () => {
    if (!categoryId || categoryId === "__new__") return;
    const catToEdit = categories.find(c => c.id === categoryId);
    if (!catToEdit) return;
    setEditCatImagePreview(catToEdit.image_url || ""); setEditCatImageFile(null); setShowEditCatDialog(true);
  };

  const handleEditCatImageSelect = async (file: File) => {
    setEditCatImageFile(file); setEditCatImagePreview(URL.createObjectURL(file));
  };

  const handleUpdateCategory = async () => {
    const catToEdit = categories.find(c => c.id === categoryId);
    if (!catToEdit) return;
    if (!editCatImageFile && !editCatImagePreview) { toast.error("Please upload a category image"); return; }
    setUpdatingCat(true);
    try {
      let imageUrl = editCatImagePreview;
      if (editCatImageFile) {
        const compressed = await compressImageToWebP(editCatImageFile);
        const cloudResult = await uploadToCloudinary(compressed.blob);
        imageUrl = cloudResult.secure_url;
      }
      const { error } = await supabase.from('categories').update({ image_url: imageUrl }).eq('id', categoryId);
      if (error) throw error;
      const { data: cats } = await supabase.from('categories').select('*').eq('is_active', true);
      setCategories(cats || []); setShowEditCatDialog(false); setEditCatImageFile(null);
      toast.success(`Category "${catToEdit.name}" image updated!`);
    } catch (err: any) { toast.error(err.message || "Failed to update category image"); } finally { setUpdatingCat(false); }
  };

  const handleNameChange = (v: string) => { setName(v); if (!isEdit) setSlug(generateSlug(v)); };

  const handleThumbnailUpload = async (files: FileList) => {
    const file = files[0]; if (!file) return;
    const id = crypto.randomUUID();
    setThumbnail({ preview: URL.createObjectURL(file), file, status: "compressing" });
    try {
      const compressed = await compressImageToWebP(file);
      blobStore.set(id, compressed.blob);
      setThumbnail({ id, preview: compressed.dataUrl, sizeKB: compressed.sizeKB, originalSizeKB: compressed.originalSizeKB, compressionRatio: compressed.compressionRatio, status: "ready" });
    } catch { toast.error(`Failed to compress ${file.name}`); setThumbnail(null); }
  };

  const handleGalleryUpload = async (files: FileList) => {
    for (const file of Array.from(files)) {
      const id = crypto.randomUUID();
      setGalleryImages(prev => [...prev, { preview: URL.createObjectURL(file), file, status: "compressing" }]);
      try {
        const compressed = await compressImageToWebP(file);
        setGalleryImages(prev => prev.map(img => img.file === file
          ? { ...img, id, preview: compressed.dataUrl, sizeKB: compressed.sizeKB, originalSizeKB: compressed.originalSizeKB, compressionRatio: compressed.compressionRatio, status: "ready", file: undefined }
          : img
        ));
        blobStore.set(id, compressed.blob);
      } catch { toast.error(`Failed to compress ${file.name}`); }
    }
  };

  const addColor = () => {
    if (!newColorName.trim()) return;
    if (colors.some(c => c.name === newColorName)) return;
    setColors([...colors, { name: newColorName, hex: newColorHex }]); setNewColorName("");
  };

  const removeColor = (name: string) => {
    setColors(colors.filter(c => c.name !== name));
    const m = { ...stockMatrix }; delete m[name]; setStockMatrix(m);
  };

  const updateStock = (color: string, size: string, qty: number) => {
    setStockMatrix(prev => ({ ...prev, [color]: { ...(prev[color] || {}), [size]: Math.max(0, qty) } }));
  };

  const handleSave = async () => {
    if (!name || !slug || !basePrice) { toast.error("Please fill required fields"); return; }
    if (!thumbnail) { toast.error("Please upload a thumbnail image"); return; }
    setSaving(true);
    try {
      let finalCategoryId = categoryId;
      if (!finalCategoryId) {
        let undefinedCat = categories.find(c => c.name.toLowerCase() === 'undefined');
        if (undefinedCat) {
          finalCategoryId = undefinedCat.id;
        } else {
          // Check DB just in case it's not active or not in state
          const { data, error } = await supabase.from('categories').select('id').ilike('name', 'undefined').maybeSingle();
          if (data) {
            finalCategoryId = data.id;
          } else {
            // Create "Undefined" category
            const { data: newCat, error: createErr } = await supabase.from('categories').insert({
              name: 'Undefined',
              slug: 'undefined',
              is_active: true,
            }).select('id').single();
            if (createErr) throw createErr;
            finalCategoryId = newCat.id;
          }
        }
      }

      const productData = {
        name, slug, description, category_id: finalCategoryId,
        base_price: Number(basePrice), sale_price: salePrice ? Number(salePrice) : null,
        material, fit_type: fitType, occasion, care_instructions: careInstructions.trim() || "Dry clean only",
        is_active: isActive, is_featured: isFeatured, is_new_arrival: isNewArrival, is_best_seller: isBestSeller,
        created_by: admin?.id,
      };
      let pId = productId;
      if (isEdit) { await supabase.from('products').update(productData).eq('id', productId); }
      else {
        const { data, error } = await supabase.from('products').insert(productData).select('id').single();
        if (error) throw error; pId = data.id;
      }
      // Upload thumbnail
      if (thumbnail.status === "ready" && thumbnail.id) {
        const blob = blobStore.get(thumbnail.id);
        if (blob) {
          try {
            const result = await uploadToCloudinary(blob);
            await supabase.from('product_images').insert({ product_id: pId, storage_path: result.public_id, public_url: result.secure_url, width: result.width, height: result.height, size_bytes: result.bytes, is_primary: true, sort_order: 0, color_hex: thumbnail.colorHex || null });
            blobStore.delete(thumbnail.id);
          } catch (err) { console.error("Thumbnail upload failed:", err); toast.error("Failed to upload thumbnail."); }
        }
      }
      // Upload gallery
      let sortOrder = 1;
      for (const img of galleryImages.filter(i => i.status === "ready" && i.id)) {
        const blob = blobStore.get(img.id!); if (!blob) continue;
        try {
          const result = await uploadToCloudinary(blob);
          await supabase.from('product_images').insert({ product_id: pId, storage_path: result.public_id, public_url: result.secure_url, width: result.width, height: result.height, size_bytes: result.bytes, is_primary: false, sort_order: sortOrder++ });
          blobStore.delete(img.id!);
        } catch (err) { console.error("Gallery upload failed:", err); toast.error("Failed to upload an image."); }
      }
      // Variants
      if (isEdit) { await supabase.from('product_variants').delete().eq('product_id', pId); }
      const variants: any[] = [];
      for (const color of colors) {
        for (const size of enabledSizes) {
          variants.push({ product_id: pId, size, color_name: color.name, color_hex: color.hex, sku: `${slug}-${size}-${color.name}`.toLowerCase().replace(/\s+/g, '-'), stock_qty: stockMatrix[color.name]?.[size] || 0 });
        }
      }
      if (variants.length > 0) { await supabase.from('product_variants').insert(variants); }
      toast.success(isEdit ? "Product updated!" : "Product created!"); navigate("/admin/inventory");
    } catch (err: any) { toast.error(err.message || "Failed to save product"); } finally { setSaving(false); }
  };

  const discountPercent = basePrice && salePrice && Number(salePrice) < Number(basePrice)
    ? Math.round(((Number(basePrice) - Number(salePrice)) / Number(basePrice)) * 100) : 0;

  const selectedCategory = categories.find(c => c.id === categoryId);

  return (
    <div className="space-y-0 -m-4 md:-m-6">
      {/* ─── Sticky Header Bar ─── */}
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-md border-b border-border px-4 md:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/admin/inventory")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-heading text-base md:text-lg font-bold truncate">{isEdit ? "Edit Product" : "Add New Product"}</h1>
            {name && <p className="text-xs text-muted-foreground font-body truncate">{name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">{saving ? "Saving..." : (isEdit ? "Update" : "Publish")}</span>
          </Button>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="px-4 md:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ════════ LEFT COLUMN: Media ════════ */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            {/* Thumbnail */}
            <div>
              <h3 className="font-heading text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                <ImageIcon className="h-4 w-4" /> Thumbnail
              </h3>
              {thumbnail ? (
                <div className="relative rounded-2xl overflow-hidden border border-border bg-muted/20 group">
                  <img src={thumbnail.preview} alt="Thumbnail" className="w-full aspect-[3/4] object-cover" />
                  {thumbnail.status === "compressing" && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  )}
                  {thumbnail.sizeKB && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                      <p className="text-[10px] text-white/80 font-body">
                        {thumbnail.originalSizeKB}KB → {thumbnail.sizeKB}KB ({thumbnail.compressionRatio})
                      </p>
                    </div>
                  )}
                  <button onClick={() => { if (thumbnail.id) blobStore.delete(thumbnail.id); setThumbnail(null); }}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 hover:bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <Badge className="absolute top-2 left-2 text-[9px] bg-primary/90">Cover Image</Badge>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-border rounded-2xl aspect-[3/4] flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                  onClick={() => document.getElementById('thumbnail-upload')?.click()}
                >
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-body font-medium text-foreground">Upload Thumbnail</p>
                  <p className="text-[11px] text-muted-foreground font-body mt-1">This appears on product cards</p>
                  <input id="thumbnail-upload" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleThumbnailUpload(e.target.files)} />
                </div>
              )}
            </div>

            {/* Gallery */}
            <div>
              <h3 className="font-heading text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                Gallery
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {galleryImages.map((img, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden border border-border group">
                    <img src={img.preview} alt="" className="aspect-square object-cover w-full" />
                    {img.status === "compressing" && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                      </div>
                    )}
                    {img.sizeKB && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                        <p className="text-[8px] text-white/80 font-body truncate">
                          {img.originalSizeKB}→{img.sizeKB}KB
                        </p>
                      </div>
                    )}
                    <button onClick={() => setGalleryImages(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/50 hover:bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {/* Add more button */}
                <div
                  className="border-2 border-dashed border-border rounded-xl aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                  onClick={() => document.getElementById('gallery-upload')?.click()}
                >
                  <Plus className="h-5 w-5 text-muted-foreground mb-1" />
                  <p className="text-[10px] text-muted-foreground font-body">Add</p>
                  <input id="gallery-upload" type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && handleGalleryUpload(e.target.files)} />
                </div>
              </div>
            </div>
          </div>

          {/* ════════ RIGHT COLUMN: Details ════════ */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">

            {/* ── Product Details ── */}
            <div className="bg-card rounded-2xl border border-border p-5 md:p-6 space-y-5">
              <h3 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider">Product Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="font-body text-xs text-muted-foreground">Product Name *</Label>
                  <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Elegant Rose Maxi Dress" className="h-11 text-base font-medium" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-xs text-muted-foreground">Slug</Label>
                  <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="elegant-rose-maxi-dress" className="font-mono text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-xs text-muted-foreground">Category *</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Select value={categoryId} onValueChange={handleCategoryChange}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          <SelectItem value="__new__" className="text-primary font-medium">
                            <span className="flex items-center gap-1"><Plus className="h-3 w-3" /> New Category</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {categoryId && categoryId !== "__new__" && (
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-9 w-9 hover:text-primary" onClick={openEditCatDialog} title="Edit Category Image">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 hover:text-destructive" onClick={handleDeleteCategory} disabled={deletingCat} title="Delete Category">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-body text-xs text-muted-foreground">Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe your product..." className="resize-none" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-body text-xs text-muted-foreground">Material</Label>
                  <Input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="Cotton Blend" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-xs text-muted-foreground">Fit Type</Label>
                  <Select value={fitType} onValueChange={setFitType}>
                    <SelectTrigger><SelectValue placeholder="Select fit" /></SelectTrigger>
                    <SelectContent>{FIT_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2 md:col-span-1">
                  <Label className="font-body text-xs text-muted-foreground">Care Instructions</Label>
                  <Input value={careInstructions} onChange={(e) => setCareInstructions(e.target.value)} placeholder="Dry clean only" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-body text-xs text-muted-foreground">Occasion</Label>
                <div className="flex flex-wrap gap-2">
                  {OCCASIONS.map(o => (
                    <button key={o} onClick={() => setOccasion(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o])}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all font-body ${occasion.includes(o) ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'border-border hover:border-primary/50'}`}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Pricing & Flags Row ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pricing */}
              <div className="bg-card rounded-2xl border border-border p-5 md:p-6 space-y-4">
                <h3 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Tag className="h-4 w-4" /> Pricing
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="font-body text-xs text-muted-foreground">MRP (₹) *</Label>
                    <Input type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="1999" className="h-11 text-lg font-semibold" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-body text-xs text-muted-foreground">Sale Price (₹)</Label>
                    <Input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="1499" className="h-11 text-lg" />
                  </div>
                  {discountPercent > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-sm px-3 py-1">{discountPercent}% OFF</Badge>
                      <span className="text-xs text-muted-foreground font-body">You save ₹{Number(basePrice) - Number(salePrice)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Flags */}
              <div className="bg-card rounded-2xl border border-border p-5 md:p-6 space-y-4">
                <h3 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Eye className="h-4 w-4" /> Visibility
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "Active", desc: "Product is live on store", checked: isActive, onChange: setIsActive },
                    { label: "Featured", desc: "Show in featured section", checked: isFeatured, onChange: setIsFeatured },
                    { label: "New Arrival", desc: "Mark as new arrival", checked: isNewArrival, onChange: setIsNewArrival },
                    { label: "Best Seller", desc: "Show in best sellers", checked: isBestSeller, onChange: setIsBestSeller },
                  ].map(flag => (
                    <div key={flag.label} className="flex items-center justify-between py-1">
                      <div>
                        <p className="text-sm font-medium font-body">{flag.label}</p>
                        <p className="text-[11px] text-muted-foreground font-body">{flag.desc}</p>
                      </div>
                      <Switch checked={flag.checked} onCheckedChange={flag.onChange} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Variants ── */}
            <div className="bg-card rounded-2xl border border-border p-5 md:p-6 space-y-5">
              <h3 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Palette className="h-4 w-4" /> Variants & Stock
              </h3>

              {/* Colors */}
              <div>
                <Label className="font-body text-xs text-muted-foreground mb-2 block">Colors</Label>
                <div className="flex gap-2 mb-3">
                  <Input placeholder="e.g. Rose Pink" value={newColorName} onChange={(e) => setNewColorName(e.target.value)} className="flex-1" onKeyDown={(e) => e.key === 'Enter' && addColor()} />
                  <ColorPickerPopover
                    value={newColorHex}
                    colorName={newColorName}
                    onColorChange={(hex, name) => { setNewColorHex(hex); if (!newColorName.trim()) setNewColorName(name); }}
                  />
                  <Button size="sm" onClick={addColor} variant="secondary"><Plus className="h-4 w-4" /></Button>
                </div>
                {colors.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {colors.map(c => (
                      <div key={c.name} className="flex items-center gap-2 bg-muted/50 rounded-full pl-1.5 pr-2 py-1 border border-border">
                        <div className="h-5 w-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: c.hex }} />
                        <span className="font-body text-xs font-medium">{c.name}</span>
                        <button onClick={() => removeColor(c.name)} className="h-4 w-4 rounded-full hover:bg-destructive/20 flex items-center justify-center"><X className="h-2.5 w-2.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sizes */}
              <div>
                <Label className="font-body text-xs text-muted-foreground mb-2 block">Sizes</Label>
                <div className="flex flex-wrap gap-2">
                  {SIZES.map(s => (
                    <button key={s} onClick={() => setEnabledSizes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                      className={`w-12 h-10 rounded-xl text-xs font-semibold border-2 transition-all font-body ${enabledSizes.includes(s) ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'border-border hover:border-primary/50'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stock matrix */}
              {colors.length > 0 && enabledSizes.length > 0 && (
                <div>
                  <Label className="font-body text-xs text-muted-foreground mb-2 block">Stock Quantities</Label>
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm font-body">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left p-3 text-xs text-muted-foreground font-medium">Size</th>
                          {colors.map(c => (
                            <th key={c.name} className="p-3 text-xs text-center font-medium">
                              <div className="flex items-center justify-center gap-1.5">
                                <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: c.hex }} />
                                {c.name}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {enabledSizes.map((size, idx) => (
                          <tr key={size} className={idx % 2 === 0 ? "" : "bg-muted/20"}>
                            <td className="p-3 font-semibold">{size}</td>
                            {colors.map(color => (
                              <td key={color.name} className="p-2 text-center">
                                <Input
                                  type="number" min={0}
                                  value={stockMatrix[color.name]?.[size] || 0}
                                  onChange={(e) => updateStock(color.name, size, parseInt(e.target.value) || 0)}
                                  className="w-16 h-9 text-center text-sm mx-auto"
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
            </div>

          </div>
        </div>
      </div>

      {/* ─── Dialogs ─── */}
      <Dialog open={showNewCatDialog} onOpenChange={(open) => { setShowNewCatDialog(open); if (!open) { setNewCatImageFile(null); setNewCatImagePreview(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-heading">Create New Category</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-body">Category Name *</Label>
              <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="e.g. Bridal Wear" autoFocus />
            </div>
            {newCatName.trim() && <p className="text-xs text-muted-foreground font-body">Slug: <code className="bg-muted px-1 py-0.5 rounded">{generateSlug(newCatName)}</code></p>}
            <div className="space-y-2">
              <Label className="font-body">Category Image *</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors" onClick={() => document.getElementById('cat-image-upload')?.click()}>
                {newCatImagePreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={newCatImagePreview} alt="Preview" className="w-24 h-24 rounded-full object-cover border-2 border-border" />
                    <p className="text-xs text-muted-foreground font-body">Click to change</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-body">Click to upload</p>
                  </div>
                )}
                <input id="cat-image-upload" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleCatImageSelect(e.target.files[0])} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCatDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateCategory} disabled={creatingCat || !newCatName.trim() || !newCatImageFile}>{creatingCat ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditCatDialog} onOpenChange={(open) => { setShowEditCatDialog(open); if (!open) { setEditCatImageFile(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-heading">Edit Category Image</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-body">Category Image</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors" onClick={() => document.getElementById('edit-cat-image-upload')?.click()}>
                {editCatImagePreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={editCatImagePreview} alt="Preview" className="w-24 h-24 rounded-full object-cover border-2 border-border" />
                    <p className="text-xs text-muted-foreground font-body">Click to change</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-body">Click to upload</p>
                  </div>
                )}
                <input id="edit-cat-image-upload" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleEditCatImageSelect(e.target.files[0])} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditCatDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateCategory} disabled={updatingCat || (!editCatImageFile && !editCatImagePreview)}>{updatingCat ? "Updating..." : "Update"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductForm;
