

# CSV Product Import Feature

## Overview
Add a "Import CSV" button to the Inventory page that lets admins upload a CSV file to bulk-create products with variants in one go.

## CSV Format
The CSV will support these columns:
- `name` (required), `description`, `material`, `fit_type`, `occasion` (comma-separated), `care_instructions`
- `category` (category name — matched or created automatically)
- `base_price` (required), `sale_price`, `discount_percent`
- `is_active`, `is_featured`, `is_new_arrival`, `is_best_seller` (true/false)
- `colors` — format: `"Red:#FF0000,Blue:#0000FF"` (name:hex pairs)
- `sizes` — format: `"S,M,L,XL"`
- `stock_qty` — default stock per variant (default: 10)
- `image_urls` — format: `"https://url1.jpg,https://url2.jpg"` (optional, external URLs)

## Changes

### 1. Create `src/components/admin/CSVImportDialog.tsx`
A dialog/sheet component with:
- **File input** accepting `.csv` files
- **Parse & preview** step: parse CSV client-side, show a table preview with row count, detected columns, and any validation errors (missing name/price)
- **Download template** button that generates a sample CSV with headers and 2 example rows
- **Import button** with progress bar showing `X / Y products imported`
- **Import logic** (per row):
  1. Find or create category by name
  2. Generate unique slug (`name-timestamp`)
  3. Insert into `products` table
  4. Generate variants: for each color × size combination, insert into `product_variants` with SKU and stock_qty
  5. If `image_urls` provided, insert into `product_images`
- **Error handling**: skip rows with errors, show summary at end ("40 imported, 2 failed" with error details)
- Uses `supabase` client directly (admin is authenticated, has RLS ALL access)

### 2. Update `src/pages/admin/Inventory.tsx`
- Add an "Import CSV" button next to the existing "Add Product" button
- Import and render the `CSVImportDialog` component
- Refresh product list after successful import

## Files to Create/Modify
- **Create**: `src/components/admin/CSVImportDialog.tsx`
- **Modify**: `src/pages/admin/Inventory.tsx` — add import button

No database changes needed — uses existing `products`, `product_variants`, `product_images`, and `categories` tables.

