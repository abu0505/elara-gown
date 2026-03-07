

# Phase 4 Implementation Plan — Reviews, Color Variants, Return Flow, Data Cleanup, UI Fixes

## Build Error Fix (FIRST)
The build error is from `jsr:@supabase/functions-js/edge-runtime.d.ts` importing `npm:openai@^4.52.5`. All edge functions import this. Fix: remove the `import "jsr:@supabase/functions-js/edge-runtime.d.ts"` line from all edge functions (it's not needed for functionality).

**Files to fix:** All 5 edge functions currently have this import line.

---

## Database Migration

Single migration with:
1. Add `return_number` column + sequence + trigger to `return_requests`
2. Add `color_hex` column to `product_images`  
3. Add missing review columns: `order_number TEXT`, `customer_name TEXT`, `customer_email TEXT` (current table has `reviewer_name` but PRD wants `customer_name`)
4. `get_product_rating_stats()` SQL function
5. Index on `reviews(product_id, is_approved, created_at DESC)`
6. Fix RLS: add permissive INSERT policy for reviews (current `reviews_public_read` only allows SELECT of approved; need INSERT for guests)
7. Wipe all dummy data from all tables + reset sequences

---

## Changes by Batch

### Batch 1: Fix Build Error + Edge Function Cleanup
- Remove `import "jsr:@supabase/functions-js/edge-runtime.d.ts"` from all edge functions
- Remove `create-admin-user` and `delete-admin-user` edge functions from `config.toml` (keeping files but removing from config since Admin Management is being removed)

### Batch 2: Remove Admin Management
- Delete `src/pages/admin/AdminManagement.tsx`
- Remove route from `App.tsx` (line 81)
- Remove import of `AdminManagement` (line 32)
- Remove from `AdminLayout.tsx` sidebar: remove `mainAdminItems` array entry for Admin Management (keep Settings)

### Batch 3: Remove Hardcoded Dummy Data
- Delete `src/data/products.ts` entirely (541 lines of hardcoded products/reviews)
- Delete `src/data/categories.ts`
- Update `Product` type definition — move to a shared types file or inline in `useProducts.ts`
- Update all imports that reference `@/data/products` and `@/data/categories`
- In `useProducts.ts`: remove import of hardcoded fallbacks, return empty arrays when DB returns nothing
- In `ProductDetail.tsx`: remove `import { products, reviews as allReviews } from "@/data/products"` and the lines using them (lines 3, 45-46)
- In `Products.tsx`: remove `import { categories as hardcodedCategories } from "@/data/categories"` (line 3)

### Batch 4: StarRating Component + Reviews System
- Create `src/components/ui/StarRating.tsx` — reusable SVG star component (interactive + display modes, half-star support)
- Update `ProductCard.tsx`: replace hardcoded `product.rating` / `product.reviewCount` with computed values from `product.reviews` array. Show nothing if 0 reviews.
- Update `useProducts.ts`: add `reviews(rating)` to `PRODUCT_SELECT` query; update `toStorefrontProduct` to pass reviews through and compute rating dynamically
- Update `ProductDetail.tsx`: full reviews section with rating breakdown bars, review cards, "Write a Review" form with verified purchase check via order number
- Create review submission logic: insert into `reviews` table, verify purchase if order number provided

### Batch 5: Color Variant Switching on Product Detail
- Add `color_hex` column to `product_images` via migration
- Update `useProducts.ts` PRODUCT_SELECT to include `color_hex` in images query
- Rewrite `ProductDetail.tsx` color/size selection:
  - `selectedColor` tracks hex string (not index)
  - Changing color filters images by `color_hex`, falls back to null (all-color) images
  - Changing color resets size selection and image index to 0
  - Available sizes derived from variants matching selected color
  - Selected variant = color + size combo (needed for `variantId` in cart)
- Update admin `ProductForm.tsx` Step 3: add per-image color assignment dropdown

### Batch 6: Order Confirmation Email
- Create `supabase/functions/send-order-confirmation/index.ts` — HTML email via Resend API
- Update `create-order` edge function to fire-and-forget invoke `send-order-confirmation` after order success
- Add to `config.toml`
- Note: Requires `RESEND_API_KEY`, `FROM_EMAIL`, `SITE_URL` secrets — will prompt user to add them

### Batch 7: Return Flow Improvements
- Create `src/pages/ReturnRequest.tsx` — 4-step customer return page (`/returns/request`)
- Create `src/pages/admin/Returns.tsx` — admin returns management page (`/admin/returns`)
- Add Returns to admin sidebar in `AdminLayout.tsx`
- Add routes in `App.tsx`
- Update `create-return-request` edge function to support `return_number` auto-generation

### Batch 8: Homepage Layout Fix
- Update `Index.tsx` — ensure New Arrivals and Best Sellers are 2 separate sections with distinct headings
- Update view-all links: `/products?filter=new_arrival` and `/products?filter=best_seller`
- Reorder sections per PRD: Hero → Categories → Promo → New Arrivals → Best Sellers → Trust → Lookbook → Newsletter

### Batch 9: Filter Fixes on Products Page
- Add color filter UI to `Products.tsx` filter panel (color swatches from DB variants)
- Add "New Arrivals" / "Best Sellers" / "On Sale" checkbox filters
- Add discount tier radio filter
- Make size filter work against `product_variants` (post-filter on fetched data, already partially works)
- Fix price range filter to use effective price (`sale_price || base_price`)
- Support `?filter=new_arrival` and `?filter=best_seller` URL params

### Batch 10: OrderSuccess Fix + Minor Cleanups
- Fix `OrderSuccess.tsx`: remove fallback random order number generation (line 8)
- Ensure order number comes from URL params only
- Fix `OrderLookup.tsx` to properly handle return eligibility (7-day window check)

---

## File Summary

**Delete:** `src/data/products.ts`, `src/data/categories.ts`, `src/pages/admin/AdminManagement.tsx`

**New files (~6):**
- `src/components/ui/StarRating.tsx`
- `src/pages/ReturnRequest.tsx`
- `src/pages/admin/Returns.tsx`
- `supabase/functions/send-order-confirmation/index.ts`
- `supabase/migrations/...phase4.sql`

**Modified files (~15):**
- All 5 edge functions (remove JSR import)
- `supabase/config.toml`
- `src/App.tsx`
- `src/hooks/useProducts.ts`
- `src/components/ProductCard.tsx`
- `src/pages/ProductDetail.tsx`
- `src/pages/Products.tsx`
- `src/pages/Index.tsx`
- `src/pages/OrderSuccess.tsx`
- `src/pages/OrderLookup.tsx`
- `src/components/admin/AdminLayout.tsx`
- `src/pages/admin/ProductForm.tsx`
- `src/stores/filterStore.ts`

---

## Secrets Required
- `RESEND_API_KEY` — for order confirmation emails
- `FROM_EMAIL` — sender address (e.g., `orders@elara.com`)
- `SITE_URL` — deployed app URL for email links

