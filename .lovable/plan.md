# Phase 3 Implementation Plan — Bug Fixes, DB Connectivity, Order Features, Performance

## Summary of Changes

This is a large implementation covering 6 areas: (1) order creation via edge function, (2) storefront reading products from Supabase, (3) coupon validation via edge function, (4) track order fix, (5) emoji removal, (6) new order cancel/return features, and (7) performance improvements.

---

## Batch 1: Database Migration

Create a single migration adding:

- `return_requests` table with RLS
- `increment_stock` and `decrement_stock` security definer functions
- 10 performance indexes (products by category, featured, orders by status/phone/number, variants, coupons, images)
- `customer_email` column already exists on `orders` table (verified in schema)

Note: RLS policies already exist on all relevant tables from Phase 2 (`orders_anon_insert`, `orders_anon_select`, `order_items_anon_insert`, `order_items_anon_select`, `products_public_read`, etc.). The current `RESTRICTIVE` policy type may be an issue — all existing policies use `Permissive: No` which means they are RESTRICTIVE, requiring ALL policies to pass. This needs investigation and likely fixing to PERMISSIVE for the anon insert/select policies.

**Critical RLS fix**: The existing policies are all RESTRICTIVE (`Permissive: No`). For orders, this means the `orders_anon_insert` (WITH CHECK true) AND `orders_admin_all` must BOTH pass for an insert — which fails for anonymous users. Need to drop and recreate the anon policies as PERMISSIVE, or switch the approach to use an edge function with service role key (bypassing RLS entirely). The edge function approach is more secure and is what we'll use.

---

## Batch 2: Edge Functions

### New Edge Functions:

1. `**create-order**` — Service role insert. Accepts customer info, shipping, items, pricing. Creates customer (upsert by email), order, order_items, decrements stock, increments coupon usage, logs initial status history. Returns `orderNumber` and `orderId`.
2. `**cancel-order**` — Validates ownership via phone match, checks status is pending/confirmed, updates to cancelled, restores stock via `increment_stock`, logs status change.
3. `**create-return-request**` — Validates order ownership, checks delivered status and 7-day window, inserts into `return_requests`.

### Existing Edge Function Updates:

4. `**validate-coupon**` — Already exists and looks correct. Add `coupon_id` to the response so the checkout can pass it to `create-order`. Also add per-user limit check.

### Config:

Update `supabase/config.toml` with `verify_jwt = false` for all new functions.

---

## Batch 3: Checkout Flow Fix (Orders appearing in admin)

`**src/pages/Checkout.tsx**`:

- Replace the current `onSubmit` (which just clears cart and navigates) with a call to `supabase.functions.invoke('create-order', { body: {...} })`
- Pass customer info, shipping address, cart items, pricing (subtotal, discount, delivery, total, coupon)
- On success: clear cart, navigate to `/checkout/success?order=ORDER_NUMBER`
- On error: show toast, don't navigate

`**src/pages/OrderSuccess.tsx**`:

- Read order number from URL search params instead of generating random ID
- Show real order number
- Link "Track Your Order" to `/account/orders`

---

## Batch 4: Storefront Products from Supabase

Currently all storefront pages (`Index.tsx`, `Products.tsx`, `ProductDetail.tsx`) read from hardcoded `src/data/products.ts`. Need to add Supabase-backed queries while keeping hardcoded data as fallback.

**Approach**: Create custom hooks that query Supabase products table with joins to images/variants/categories. If Supabase returns data, use it; otherwise fall back to hardcoded data. This way the storefront works whether DB has products or not.

**Files to modify**:

- `src/pages/Index.tsx` — Use hooks for featured products, new arrivals, best sellers
- `src/pages/Products.tsx` — Query products from Supabase with filters
- `src/pages/ProductDetail.tsx` — Query single product by slug/ID from Supabase
- `src/components/home/ProductSection.tsx` — Accept products from props (already does)

**New file**: `src/hooks/useProducts.ts` — Custom hooks wrapping React Query + Supabase queries for products.

---

## Batch 5: Coupon Fix

`**src/stores/cartStore.ts**`:

- Remove hardcoded `COUPONS` map
- Change `applyCoupon` to be async, call `validate-coupon` edge function
- Store coupon result (id, code, discountAmount) in cart state
- Update `getDiscount()` to return the server-calculated discount amount
- Update `getDeliveryCharge()` to account for discount in free delivery threshold

`**src/pages/Cart.tsx**`:

- Make coupon apply handler async
- Show loading state while validating
- Display server error messages

---

## Batch 6: Track Order Fix

`**src/pages/OrderLookup.tsx**`:

- Already queries Supabase correctly with `order_number` + `customer_phone`
- The issue is the query uses `customer_phone` but the orders table stores phone in `shipping_phone` field AND `customer_phone` field
- Fix: query by `order_number` + match against both phone fields, or use the edge function approach
- Add proper status timeline component with Lucide icons

---

## Batch 7: Emoji Removal

Replace all emoji characters with Lucide icons across these files:


| File                | Emojis to Replace                 |
| ------------------- | --------------------------------- |
| `Navbar.tsx`        | 🏠👗🆕🔥🎉📦🔄📞ℹ️ in mobile menu |
| `Footer.tsx`        | 📍📞📧 in contact section         |
| `PromoBanner.tsx`   | 🎉                                |
| `Newsletter.tsx`    | 🎉 in toast                       |
| `ProductDetail.tsx` | ✅🔄💵 in delivery section         |
| `OrderSuccess.tsx`  | 🎉 in heading                     |
| `Contact.tsx`       | ✅ in toast                        |
| `Cart.tsx`          | 🗑️ in toast                      |
| `ProductForm.tsx`   | ✅ in compression stats            |


---

## Batch 8: Cancel & Return Order Features

**Cancel Order** (in `OrderLookup.tsx` order detail view):

- Show "Cancel Order" button when status is `pending` or `confirmed`
- Confirmation dialog with reason selection (radio: Ordered by mistake, Found better price, Changed mind, Delivery too long, Other)
- Calls `cancel-order` edge function
- Updates UI on success

**Return Order** (in `OrderLookup.tsx` order detail view):

- Show "Return / Exchange" button when status is `delivered` and within 7 days
- Dialog with item selection checkboxes, return type (return/exchange), reason, optional photo upload
- Calls `create-return-request` edge function

**Admin Order Detail** (`src/pages/admin/OrderDetail.tsx`):

- Add return requests section showing linked return_requests for the order
- Admin can approve/reject, update status, add notes

---

## Batch 9: Performance

- Configure `QueryClient` with `staleTime: 5min`, `gcTime: 10min`, `refetchOnWindowFocus: false`
- Add React Query hooks for all Supabase data fetching
- Homepage: limit queries to 8 products per section
- Products page: paginated with Load More (12 per page)
- Search: already has debounce in SearchOverlay
- Admin dashboard: keep existing direct queries (already functional)
- Supabase realtime for new orders in admin panel

---

## File Change Summary

**New files (~10)**:

- `supabase/migrations/...phase3.sql` (migration)
- `supabase/functions/create-order/index.ts`
- `supabase/functions/cancel-order/index.ts`
- `supabase/functions/create-return-request/index.ts`
- `src/hooks/useProducts.ts`

**Modified files (~15)**:

- `supabase/config.toml` (add function configs)
- `src/pages/Checkout.tsx` (order creation via edge function)
- `src/pages/OrderSuccess.tsx` (real order number)
- `src/pages/Index.tsx` (Supabase product queries)
- `src/pages/Products.tsx` (Supabase queries with filters)
- `src/pages/ProductDetail.tsx` (Supabase query + emoji removal)
- `src/pages/Cart.tsx` (async coupon + emoji removal)
- `src/pages/OrderLookup.tsx` (fix query + cancel/return UI)
- `src/stores/cartStore.ts` (async coupon validation)
- `src/components/Navbar.tsx` (emoji removal)
- `src/components/Footer.tsx` (emoji removal)
- `src/components/home/PromoBanner.tsx` (emoji removal)
- `src/components/home/Newsletter.tsx` (emoji removal)
- `src/pages/Contact.tsx` (emoji removal)
- `src/pages/admin/OrderDetail.tsx` (return requests section)
- `src/pages/admin/ProductForm.tsx` (emoji removal)
- `src/App.tsx` (QueryClient config)
- `supabase/functions/validate-coupon/index.ts` (add coupon_id to response)

&nbsp;

After makign these test these areas end to end:  


- Test the admin panel by logging in and exploring the dashboard, orders, inventory, and coupon pages (admin credentials: [admin@elara.com](mailto:admin@elara.com) , pass:- Elara@admin_2026)
- Test the storefront end-to-end: browse products, add to cart, go through checkout, then check the About, FAQ, and Contact pages
- Check the mobile experience at 375px width — bottom nav, hamburger menu, and all new customer pages