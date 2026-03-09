# Phase 2 Implementation Plan — Admin Panel, Database Schema, and Customer Pages

## Current State

- Fully functional customer storefront with hardcoded product data (24 products, 6 categories)
- Zustand stores for cart, wishlist, and filters
- Pages: Home, Products, ProductDetail, Cart, Checkout, OrderSuccess
- Supabase project connected but no tables exist yet
- Theme: HSL-based Deep Rose primary (`340 82% 38%`), Inter + Playfair Display fonts

## Scope

This is a very large implementation. Given the constraint of doing it in a single phase, the work will be organized into logical batches executed sequentially.

---

## Batch 1: Database Schema + Storage Buckets

Create all Supabase tables via migrations. Key adjustments from the PRD to follow best practices:

**Admin roles**: Use a separate `admin_roles` table with a `security definer` function (`is_admin`) to avoid infinite recursion in RLS policies. The PRD's inline subquery approach (`SELECT role FROM admins WHERE...`) would cause recursive RLS issues.

**Tables to create (14 total):**

1. `admins` — admin profiles linked to `auth.users`
2. `admin_roles` — stores role per admin (main_admin / sub_admin)
3. `categories` — product categories
4. `products` — product catalog
5. `product_variants` — size/color/stock per product
6. `product_images` — image metadata
7. `customers` — customer profiles
8. `addresses` — customer addresses
9. `coupons` — discount codes
10. `orders` — order records with address snapshot
11. `order_items` — line items per order
12. `order_status_history` — status change log
13. `reviews` — product reviews
14. `support_tickets` — contact/support submissions
15. `store_settings` — key-value store settings

**Additional DB objects:**

- `order_seq` sequence + `generate_order_number()` trigger
- `daily_revenue` view
- `inventory_summary` view
- `is_admin()` security definer function
- `is_main_admin()` security definer function

**Storage buckets:**

- `product-images` (public, WebP only, 50KB max)
- `admin-avatars` (public, image/*, 200KB max)

**RLS policies** on all tables using the security definer functions.

---

## Batch 2: Edge Functions

5 edge functions (all with `verify_jwt = false`, manual auth validation):

1. `**create-admin-user**` — uses service role to create auth user + insert admin record
2. `**delete-admin-user**` — uses service role to delete auth user
3. `**validate-coupon**` — server-side coupon validation
4. `**get-dashboard-stats**` — aggregated analytics by duration
5. `**export-orders-csv**` — filtered order export

---

## Batch 3: Image Compression Utility

- Create `src/utils/imageCompressor.ts` — client-side Canvas API compression to WebP < 50KB
- No external libraries needed

---

## Batch 4: Admin Auth + Layout

- **Admin login page** (`/admin/login`) — Supabase email/password auth, checks `admins` table + `is_active`
- **Admin auth context/store** — Zustand store for admin session (profile, role)
- **Admin layout shell** — dark sidebar (240px), top header, mobile drawer
- **Route protection** — `RequireAdmin` and `RequireMainAdmin` wrapper components
- **Admin sidebar nav** — Dashboard, Orders, Inventory, Coupons, Admin Management (main_admin only), Settings (main_admin only)

---

## Batch 5: Admin Dashboard

- Duration selector (Today / Week / Month / Year / Lifetime)
- 4 KPI cards (Revenue, Orders, AOV, New Customers)
- Revenue line chart (Recharts)
- Orders by status donut chart
- Top selling products bar chart
- Revenue by category bar chart
- Recent orders table (last 10)
- Low stock alerts
- Quick stats row

---

## Batch 6: Admin Order Management

- Orders list with search, filters (status, date, delivery type, payment), sorting, pagination
- Inline status update via dropdown
- Order detail page with status timeline, customer/shipping info, items table, admin notes
- CSV export via edge function
- Bulk actions (status update, export)

---

## Batch 7: Admin Inventory Management

- Products table with search, filter, sort, status toggle
- 4-step Add/Edit Product form:
  1. Basic info (name, slug, category, description, material, fit, occasion, toggles)
  2. Pricing (base price, sale price, auto discount %)
  3. Images (drag-drop upload with compression feedback UI)
  4. Variants (color management + stock matrix grid)
- Delete product (soft delete, hard delete for main_admin)

---

## Batch 8: Admin Coupons + Admin Management + Settings

- **Coupons**: CRUD table + create/edit modal, inline analytics expand
- **Admin Management** (main_admin only): admin users table, add sub-admin (via edge function), edit, delete
- **Settings** (main_admin only): store info, delivery settings, social links, Razorpay placeholder

---

## Batch 9: Customer-Facing Pages (10 pages)

All using existing brand theme, Navbar, Footer:

1. `/account/orders` — Guest order lookup (order# + phone)
2. `/about` — Hero, story, values, numbers, CTA
3. `/contact` — Contact form (inserts to `support_tickets`) + contact info
4. `/faq` — Accordion FAQ sections
5. `/size-guide` — Measurement chart + guide
6. `/returns` — Return policy content
7. `/shipping` — Shipping info content
8. `/privacy-policy` — Privacy policy content
9. `/terms` — Terms & conditions content
10. `/support` — Help center with search, quick action cards, embedded FAQ + contact form

---

## Batch 10: Navigation & Footer Updates + Routing

- Update Footer with all new page links
- Update mobile hamburger menu
- Add all new routes to `App.tsx`
- Enable Supabase realtime on `orders` and `support_tickets` tables

---

## Technical Decisions


| Decision            | Approach                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Admin roles         | Separate `admin_roles` table + `is_admin()` / `is_main_admin()` security definer functions to prevent RLS recursion |
| Admin user creation | Edge function with service role key (never exposed client-side)                                                     |
| Image compression   | Client-side Canvas API, no external library                                                                         |
| Charts              | Recharts (already installed)                                                                                        |
| Admin state         | Zustand store for admin session                                                                                     |
| Color theme         | Keep existing HSL variables (`340 82% 38%` primary), add admin sidebar dark colors as Tailwind utilities            |
| Realtime            | Supabase channels for new order notifications in admin                                                              |
| Customer auth       | Not implemented (Phase 3), guest order lookup only                                                                  |


## Files to Create/Modify (estimated 50+ files)

**New files:** ~45 component/page files, 5 edge functions, 1 utility, 1 admin store, 1 admin auth context
**Modified files:** `App.tsx` (routes), `Footer.tsx` (links), `Navbar.tsx` (menu links), `supabase/config.toml` (edge function configs)

(Delete the entire functionality related to wishlist i don't want wishlist feature in website entirely delete backend, frontend, database, each and everything related to wishlist)