import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { compressImageToWebP } from "@/utils/imageCompressor";
import { uploadToCloudinary } from "@/utils/cloudinaryUpload";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Trash2, Edit, Plus, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface Category {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    image_url: string | null;
}

export default function AdminCategories() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    // Dialog states
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    // Form states
    const [name, setName] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>("");
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("categories")
                .select("*")
                .order("sort_order", { ascending: true })
                .order("created_at", { ascending: false });

            if (error) throw error;
            setCategories(data || []);
        } catch (error: any) {
            toast.error("Failed to fetch categories: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const generateSlug = (n: string) => {
        const base = n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        return `${base}-${Date.now().toString(36)}`;
    };

    const handleImageSelect = (file: File) => {
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const openCreateDialog = () => {
        setEditingCategory(null);
        setName("");
        setIsActive(true);
        setImageFile(null);
        setImagePreview("");
        setIsDialogOpen(true);
    };

    const openEditDialog = (category: Category) => {
        setEditingCategory(category);
        setName(category.name);
        setIsActive(category.is_active);
        setImageFile(null);
        setImagePreview(category.image_url || "");
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error("Category name is required");
            return;
        }

        setSaving(true);
        try {
            let imageUrl = imagePreview;

            if (imageFile) {
                toast.info("Uploading image...", { id: "uploading-toast" }); // persistent toast to show process
                const compressed = await compressImageToWebP(imageFile);
                const cloudResult = await uploadToCloudinary(compressed.blob);
                imageUrl = cloudResult.secure_url;
                toast.dismiss("uploading-toast");
            }

            if (editingCategory) {
                // Update existing
                const { error } = await supabase
                    .from("categories")
                    .update({
                        name: name.trim(),
                        is_active: isActive,
                        image_url: imageUrl,
                        // Only update slug if name changed significantly (optional, safer to not update slug to avoid breaking URLs. Left out here.)
                    })
                    .eq("id", editingCategory.id);

                if (error) throw error;
                toast.success("Category updated successfully");
            } else {
                // Create new
                const slug = generateSlug(name.trim());
                const { error } = await supabase
                    .from("categories")
                    .insert({
                        name: name.trim(),
                        slug,
                        is_active: isActive,
                        image_url: imageUrl,
                    });

                if (error) throw error;
                toast.success("Category created successfully");
            }

            await fetchCategories();
            setIsDialogOpen(false);
        } catch (error: any) {
            toast.dismiss("uploading-toast");
            toast.error(error.message || "Failed to save category");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, catName: string) => {
        if (!window.confirm(`Are you sure you want to delete the category "${catName}"? Products in this category might break if not handled.`)) {
            return;
        }

        setDeleting(id);
        try {
            const { error } = await supabase
                .from("categories")
                .delete()
                .eq("id", id);

            if (error) throw error;

            toast.success("Category deleted");
            setCategories(categories.filter(c => c.id !== id));
        } catch (error: any) {
            toast.error(error.message || "Failed to delete category");
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-heading">Categories</h1>
                    <p className="text-muted-foreground font-body">Manage product categories and imagery</p>
                </div>
                <Button onClick={openCreateDialog} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Category
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm font-body">
                            <thead className="bg-muted/50 border-b border-border">
                                <tr>
                                    <th className="font-semibold text-left p-4 pb-3">Image</th>
                                    <th className="font-semibold text-left p-4 pb-3">Name</th>
                                    <th className="font-semibold text-left p-4 pb-3">Status</th>
                                    <th className="font-semibold text-right p-4 pb-3 w-32">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                            Loading categories...
                                        </td>
                                    </tr>
                                ) : categories.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                            No categories found.
                                        </td>
                                    </tr>
                                ) : (
                                    categories.map((category) => (
                                        <tr key={category.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="p-4">
                                                <div className="h-12 w-12 rounded bg-muted/50 overflow-hidden border border-border flex flex-shrink-0 items-center justify-center">
                                                    {category.image_url ? (
                                                        <img src={category.image_url} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <p className="font-medium text-base">{category.name}</p>
                                                <p className="text-xs text-muted-foreground font-mono mt-0.5">/{category.slug}</p>
                                            </td>
                                            <td className="p-4">
                                                <div className={`inline-flex items-center px-2 py-1 flex-shrink-0 rounded-full text-xs font-semibold ${category.is_active ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                                                    {category.is_active ? "Active" : "Hidden"}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(category)} className="h-8 w-8 hover:text-primary transition-colors">
                                                        <Edit className="h-4 w-4" />
                                                        <span className="sr-only">Edit</span>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id, category.name)} disabled={deleting === category.id} className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive transition-colors">
                                                        {deleting === category.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                        <span className="sr-only">Delete</span>
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-heading">
                            {editingCategory ? "Edit Category" : "Create New Category"}
                        </DialogTitle>
                        <DialogDescription>
                            Add a name and upload an image to clearly distinguish this category.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-4">
                        <div className="space-y-2">
                            <Label className="font-body">Category Name <span className="text-destructive">*</span></Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Bridal Wear"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="font-body">Category Cover Image <span className="text-destructive">*</span></Label>
                            <div
                                className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors group relative"
                                onClick={() => document.getElementById('cat-image-global-upload')?.click()}
                            >
                                {imagePreview ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="w-24 h-24 rounded-full object-cover shadow-sm bg-muted/50 border border-border group-hover:opacity-80 transition-opacity"
                                        />
                                        <div className="text-xs font-medium bg-secondary text-secondary-foreground rounded-full px-3 py-1 font-body">Change Image</div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3 py-4 text-muted-foreground">
                                        <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                                            <Upload className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium font-body text-foreground pb-0.5">Click to browse</p>
                                            <p className="text-xs font-body">PNG, JPG up to 5MB</p>
                                        </div>
                                    </div>
                                )}
                                <input
                                    id="cat-image-global-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-border pt-4">
                            <div className="space-y-0.5">
                                <Label className="font-body">Active Status</Label>
                                <p className="text-xs text-muted-foreground font-body">Show on main website</p>
                            </div>
                            <Switch checked={isActive} onCheckedChange={setIsActive} />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving || !name.trim()}>
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                </>
                            ) : (
                                "Save Category"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
