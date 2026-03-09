
## Root Cause Analysis

The color-switching feature is **architecturally complete** but **broken at the data layer**. Here's exactly what's happening:

### What the code does (correctly):
- `filteredImages` on ProductDetail line 87–94 filters `product.imageColorMap` where `img.colorHex === selectedColor`
- If no color-matched images found, it falls back to showing ALL images
- `handleColorChange` resets `currentImage` to 0

### Why it doesn't work:
**The `color_hex` field on `product_images` is never being set when the admin uploads images.** 

In `ProductForm.tsx` lines 300–315, when images are uploaded and inserted into `product_images`, the insert calls are:
```js
// Thumbnail (line 302):
await supabase.from('product_images').insert({ product_id: pId, storage_path, public_url, width, height, size_bytes, is_primary: true, sort_order: 0 })
// No color_hex!

// Gallery (line 313):
await supabase.from('product_images').insert({ product_id: pId, storage_path, public_url, width, height, size_bytes, is_primary: false, sort_order: sortOrder++ })
// No color_hex!
```

So every image gets `color_hex = null`. Then in `filteredImages`:
- `colorImages` = images where `colorHex === selectedColor` → always empty (all are null)
- `neutralImages` = images where `!colorHex` → ALL images (all are null)
- Falls back to showing ALL images → no switching happens

### The Fix (Two Parts):

**Part 1: Admin `ProductForm.tsx`** — Add a per-image color assignment UI in the gallery section. Each uploaded gallery image gets a dropdown/color picker to assign it to one of the defined colors. The thumbnail can also get a color assignment. When saving, pass `color_hex` in the insert.

**Part 2: `ImageUpload` interface** — Add `colorHex?: string | null` to the `ImageUpload` type so the state tracks which color each image belongs to.

### Implementation Plan:

#### `ImageUpload` interface update:
```ts
interface ImageUpload {
  // existing fields...
  colorHex?: string | null;  // NEW — which color this image belongs to
}
```

#### Gallery UI change — each image card gets a small color swatch selector:
- Below each gallery image thumbnail, show a row of small color swatches (from the `colors` state array)
- Clicking a swatch assigns that color to the image (`colorHex = c.hex`)
- A small "×" or "none" option sets it to null (neutral/all colors)
- Show a tiny color dot indicator on the image corner to confirm assignment
- Thumbnail (cover image) can also be assigned a color

#### Save logic change — pass `color_hex` when inserting:
```js
// Thumbnail
await supabase.from('product_images').insert({ 
  ..., 
  color_hex: thumbnail.colorHex || null 
})

// Gallery
await supabase.from('product_images').insert({ 
  ..., 
  color_hex: img.colorHex || null 
})
```

#### Edit mode — load `color_hex` from existing images:
In `loadProduct()`, the existing gallery image loading on lines 116 doesn't currently load `color_hex`. Fix:
```js
setGalleryImages(imgs.filter(img => !img.is_primary).map(img => ({
  ...,
  colorHex: img.color_hex || null  // load from DB
})))
```

### What changes:
- **Only `src/pages/admin/ProductForm.tsx`** needs to change
- No DB migration needed — `color_hex` column already exists on `product_images`
- No changes needed to `ProductDetail.tsx` — the filtering logic is already correct
- No changes needed to `useProducts.ts` — already fetches `color_hex` from images

### UX Design for Color Assignment in Gallery:
Each gallery image tile shows a small footer strip with:
- Color dot swatches (one per defined color) — click to assign
- "All" option — clears color assignment (neutral)
- Currently selected color shown with a ring/checkmark
- If no colors are defined yet, show a message "Add colors in Variants section to assign"

This is intuitive: admin first defines colors in the Variants section, then comes back up to the gallery and assigns each image to a color.

### Files to change: 1
- `src/pages/admin/ProductForm.tsx` — Add `colorHex` to `ImageUpload` type, add color picker UI per image in gallery, pass `color_hex` in save, load `color_hex` in edit mode
