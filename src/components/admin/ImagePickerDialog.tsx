import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Check, Image as ImageIcon, X } from "lucide-react";

interface WebsiteImage {
  public_url: string;
  product_name: string;
  is_primary: boolean;
}

interface ImagePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (urls: string[]) => void;
  mode: "single" | "multi";
  title?: string;
}

/**
 * Transforms a Cloudinary URL to return a smaller thumbnail for faster grid loading.
 * e.g. /upload/v123/image.jpg → /upload/w_200,h_200,c_fill,q_auto,f_auto/v123/image.jpg
 */
function toThumb(url: string, size = 200): string {
  if (!url.includes("res.cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/w_${size},h_${size},c_fill,q_auto,f_auto/`);
}

export default function ImagePickerDialog({
  open,
  onOpenChange,
  onSelect,
  mode,
  title,
}: ImagePickerDialogProps) {
  const [images, setImages] = useState<WebsiteImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Fetch images when dialog opens
  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setSearch("");
    fetchImages();
  }, [open]);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("product_images")
        .select("public_url, is_primary, product_id")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch product names for display
      const productIds = [...new Set((data || []).map((d) => d.product_id))];
      const { data: products } = await supabase
        .from("products")
        .select("id, name")
        .in("id", productIds);

      const productMap = new Map(
        (products || []).map((p) => [p.id, p.name])
      );

      // Deduplicate by public_url
      const seen = new Set<string>();
      const uniqueImages: WebsiteImage[] = [];
      for (const img of data || []) {
        if (!seen.has(img.public_url)) {
          seen.add(img.public_url);
          uniqueImages.push({
            public_url: img.public_url,
            product_name: productMap.get(img.product_id) || "Unknown",
            is_primary: img.is_primary ?? false,
          });
        }
      }

      setImages(uniqueImages);
    } catch (err) {
      console.error("Failed to fetch images:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return images;
    const q = search.toLowerCase();
    return images.filter((img) => img.product_name.toLowerCase().includes(q));
  }, [images, search]);

  const toggleSelect = (url: string) => {
    if (mode === "single") {
      // In single mode, select and immediately return
      onSelect([url]);
      onOpenChange(false);
      return;
    }
    // Multi mode
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const handleConfirmMulti = () => {
    onSelect(Array.from(selected));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {title || (mode === "single" ? "Choose an Image" : "Choose Images")}
          </DialogTitle>
          <DialogDescription>
            Browse all images from your website. {mode === "multi" ? "Select multiple images, then click Confirm." : "Click an image to select it."}
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name..."
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Image Grid */}
        <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-3" />
              <p className="text-sm font-body">Loading images...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ImageIcon className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-body">
                {search ? "No images match your search." : "No images found on your website yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 pb-4">
              {filtered.map((img) => {
                const isSelected = selected.has(img.public_url);
                return (
                  <button
                    key={img.public_url}
                    type="button"
                    onClick={() => toggleSelect(img.public_url)}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all group aspect-square bg-muted/30
                      ${isSelected
                        ? "border-primary ring-2 ring-primary/30 scale-[0.96]"
                        : "border-transparent hover:border-primary/40"
                      }`}
                  >
                    <img
                      src={toThumb(img.public_url)}
                      alt={img.product_name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    {/* Hover overlay with product name */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <p className="text-[10px] text-white font-body leading-tight line-clamp-2">
                        {img.product_name}
                      </p>
                    </div>
                    {/* Primary badge */}
                    {img.is_primary && (
                      <Badge className="absolute top-1 left-1 text-[8px] px-1.5 py-0 bg-primary/80 pointer-events-none">
                        Cover
                      </Badge>
                    )}
                    {/* Selection check */}
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                        <Check className="h-3.5 w-3.5 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {mode === "multi" && (
          <DialogFooter className="gap-2 sm:gap-0 border-t border-border pt-4">
            <div className="flex-1 text-sm text-muted-foreground font-body">
              {selected.size > 0
                ? `${selected.size} image${selected.size > 1 ? "s" : ""} selected`
                : "No images selected"}
            </div>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmMulti}
              disabled={selected.size === 0}
            >
              Add {selected.size > 0 ? selected.size : ""} Image{selected.size !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
