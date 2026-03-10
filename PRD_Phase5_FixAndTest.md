# Product Requirements Document (PRD) — Phase 5
## Fix Everything First → Then Test Both Flows
**Version:** 5.0
**Date:** March 2026
**Repository:** https://github.com/abu0505/elara-gown.git
**Supabase Project:** Ayana Boutique Project (`sjeupdkxuctxwrzmnlzb`)
**Admin Credentials:** admin@elara.com / Elara@admin_2026

---

## CRITICAL CONTEXT FOR LOVABLE

Before touching a single component, read this carefully:

The root cause of nearly every broken feature in this project is a **database schema mismatch**. The code was written against the full PRD schema, but the actual Supabase database has a simpler, older schema with different column names. The fix strategy is to **migrate the database to match the code** (not the other way around) because the code is the more complete and correct version.

**Do not change any working component's logic. Only:**
1. Run SQL migrations to bring the DB in line with the code
2. Deploy the 5 missing edge functions
3. Fix the small number of code references that point to wrong column names
4. Create 2 missing tables
5. Fix the 2 remaining emojis
6. Then run the full test suite defined in Part 2

---

# PART 1 — FIX EVERYTHING

---

## FIX 1 — Database Schema Migrations

Run all of the following SQL in Supabase SQL Editor **in the exact order shown**.

### FIX 1A — `products` table — Add Missing Columns

The `products` table has `price` but the code expects `base_price`. It is also missing 8 columns entirely.

```sql
-- Step 1: Add base_price as alias (copy existing price values)
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price NUMERIC(10,2);
UPDATE products SET base_price = price WHERE base_price IS NULL;

-- Step 2: Add discount_percent as a generated column
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_percent INTEGER
  GENERATED ALWAYS AS (
    CASE
      WHEN sale_price IS NOT NULL AND price > 0
        THEN GREATEST(0, ROUND(((price - sale_price) / price) * 100)::INTEGER)
      ELSE 0
    END
  ) STORED;

-- Step 3: Add all missing product attribute columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_new_arrival  BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_best_seller  BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS material        TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS fit_type        TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS occasion        TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS care_instructions TEXT;

-- Step 4: Make sure created_by exists (for admin tracking)
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_by UUID;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;
```

### FIX 1B — `product_images` table — Fix Column Names + Add Missing

```sql
-- The code expects 'public_url' but the DB has 'url'
-- Add public_url as a copy of url, keep url for backward compat
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS public_url TEXT;
UPDATE product_images SET public_url = url WHERE public_url IS NULL;

-- Add color_hex column for per-color image association
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS color_hex TEXT DEFAULT NULL;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'product_images'
ORDER BY ordinal_position;
```

### FIX 1C — `product_variants` table — Fix Column Name Aliases

```sql
-- Code expects 'color_name' but DB has 'color'
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS color_name TEXT;
UPDATE product_variants SET color_name = color WHERE color_name IS NULL;

-- Code expects 'stock_qty' but DB has 'stock_quantity'
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS stock_qty INTEGER;
UPDATE product_variants SET stock_qty = stock_quantity WHERE stock_qty IS NULL;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'product_variants'
ORDER BY ordinal_position;
```

### FIX 1D — `orders` table — Add Missing Columns

```sql
-- Code expects 'total_amount' but DB has 'total'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2);
UPDATE orders SET total_amount = total WHERE total_amount IS NULL;

-- Add flat shipping fields (code reads these directly from order row)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_name     TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_phone    TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address1 TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address2 TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_landmark TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_city     TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_state    TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_pincode  TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email    TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone    TEXT;

-- Add delivery type column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'standard'
  CHECK (delivery_type IN ('standard', 'express'));

-- Add discount_amount column (code uses this, DB has 'discount')
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2);
UPDATE orders SET discount_amount = discount WHERE discount_amount IS NULL;

-- Add delivery_charge column (code uses this, DB has 'shipping_cost')
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_charge NUMERIC(10,2);
UPDATE orders SET delivery_charge = shipping_cost WHERE delivery_charge IS NULL;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;
```

### FIX 1E — Create Missing Table: `order_status_history`

```sql
CREATE TABLE IF NOT EXISTS order_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  old_status  TEXT,
  new_status  TEXT NOT NULL,
  note        TEXT,
  changed_by  UUID,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_order_history" ON order_status_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Public can read their own order history (needed for track order timeline)
CREATE POLICY "public_read_order_history" ON order_status_history
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order
  ON order_status_history(order_id, created_at DESC);
```

### FIX 1F — Create Missing Table: `reviews` (Aligned with Code)

The DB has `product_reviews` but the code queries `reviews` with columns that don't exist in `product_reviews`. Create the `reviews` table that the code expects:

```sql
CREATE TABLE IF NOT EXISTS reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id        UUID REFERENCES orders(id),
  order_number    TEXT,
  customer_name   TEXT NOT NULL,
  customer_email  TEXT,
  rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title           TEXT,
  body            TEXT NOT NULL,
  is_verified     BOOLEAN DEFAULT false,
  is_approved     BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Public can read approved reviews
CREATE POLICY "public_read_reviews" ON reviews
  FOR SELECT USING (is_approved = true);

-- Anyone can submit a review
CREATE POLICY "public_insert_review" ON reviews
  FOR INSERT WITH CHECK (true);

-- Admins can manage all
CREATE POLICY "admin_manage_reviews" ON reviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_reviews_product
  ON reviews(product_id, is_approved, created_at DESC);
```

### FIX 1G — Create Missing Table: `return_requests`

```sql
CREATE SEQUENCE IF NOT EXISTS return_seq START 1;

CREATE TABLE IF NOT EXISTS return_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number   TEXT UNIQUE,
  order_id        UUID NOT NULL REFERENCES orders(id),
  order_item_id   UUID REFERENCES order_items(id),
  reason          TEXT NOT NULL,
  reason_detail   TEXT,
  return_type     TEXT NOT NULL DEFAULT 'return'
                  CHECK (return_type IN ('return', 'exchange')),
  exchange_size   TEXT,
  status          TEXT NOT NULL DEFAULT 'requested'
                  CHECK (status IN (
                    'requested','approved','pickup_scheduled',
                    'picked_up','received','refund_initiated','refunded','rejected'
                  )),
  images          TEXT[],
  admin_note      TEXT,
  refund_amount   NUMERIC(10,2),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Auto-generate return number
CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.return_number = 'RET-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                      LPAD(nextval('return_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_return_number ON return_requests;
CREATE TRIGGER set_return_number
  BEFORE INSERT ON return_requests
  FOR EACH ROW EXECUTE FUNCTION generate_return_number();

ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_insert_return" ON return_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "public_read_return" ON return_requests
  FOR SELECT USING (true);

CREATE POLICY "admin_manage_returns" ON return_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
```

### FIX 1H — Fix RLS Policies (Admin Read Access)

The existing RLS policies block admins from reading orders, products, and reviews. Fix them all:

```sql
-- Orders: Admin can read and update all orders
DROP POLICY IF EXISTS "admin_read_orders" ON orders;
CREATE POLICY "admin_read_orders" ON orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "admin_update_orders" ON orders;
CREATE POLICY "admin_update_orders" ON orders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Allow public (unauthenticated/guest) order insert via edge function
-- The edge function uses service role so this is supplementary
DROP POLICY IF EXISTS "public_insert_orders" ON orders;
CREATE POLICY "public_insert_orders" ON orders
  FOR INSERT WITH CHECK (true);

-- Order items: public read for order lookup
DROP POLICY IF EXISTS "public_read_order_items" ON order_items;
CREATE POLICY "public_read_order_items" ON order_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_manage_order_items" ON order_items;
CREATE POLICY "admin_manage_order_items" ON order_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Products: public read active products
DROP POLICY IF EXISTS "public_read_products" ON products;
CREATE POLICY "public_read_products" ON products
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "admin_manage_products" ON products;
CREATE POLICY "admin_manage_products" ON products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Product images: public read
DROP POLICY IF EXISTS "public_read_product_images" ON product_images;
CREATE POLICY "public_read_product_images" ON product_images
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_manage_product_images" ON product_images;
CREATE POLICY "admin_manage_product_images" ON product_images
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Product variants: public read active
DROP POLICY IF EXISTS "public_read_variants" ON product_variants;
CREATE POLICY "public_read_variants" ON product_variants
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "admin_manage_variants" ON product_variants;
CREATE POLICY "admin_manage_variants" ON product_variants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Categories: public read
DROP POLICY IF EXISTS "public_read_categories" ON categories;
CREATE POLICY "public_read_categories" ON categories
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "admin_manage_categories" ON categories;
CREATE POLICY "admin_manage_categories" ON categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
```

### FIX 1I — Stock Management Functions

```sql
-- Decrement stock when order placed
CREATE OR REPLACE FUNCTION decrement_stock(p_variant_id UUID, p_quantity INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE product_variants
  SET stock_quantity = GREATEST(0, stock_quantity - p_quantity),
      stock_qty = GREATEST(0, COALESCE(stock_qty, stock_quantity) - p_quantity),
      updated_at = now()
  WHERE id = p_variant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment stock when order cancelled
CREATE OR REPLACE FUNCTION increment_stock(p_variant_id UUID, p_quantity INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE product_variants
  SET stock_quantity = stock_quantity + p_quantity,
      stock_qty = COALESCE(stock_qty, stock_quantity) + p_quantity,
      updated_at = now()
  WHERE id = p_variant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### FIX 1J — Performance Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_products_active
  ON products(is_active, created_at DESC) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_new_arrival
  ON products(is_new_arrival) WHERE is_active = true AND is_new_arrival = true;

CREATE INDEX IF NOT EXISTS idx_products_best_seller
  ON products(is_best_seller) WHERE is_active = true AND is_best_seller = true;

CREATE INDEX IF NOT EXISTS idx_products_featured
  ON products(is_featured) WHERE is_active = true AND is_featured = true;

CREATE INDEX IF NOT EXISTS idx_products_category
  ON products(category_id, is_active);

CREATE INDEX IF NOT EXISTS idx_orders_status
  ON orders(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_phone
  ON orders(shipping_phone);

CREATE INDEX IF NOT EXISTS idx_orders_number
  ON orders(order_number);

CREATE INDEX IF NOT EXISTS idx_orders_email
  ON orders(customer_email);

CREATE INDEX IF NOT EXISTS idx_product_images_product
  ON product_images(product_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_variants_product
  ON product_variants(product_id, is_active);

CREATE INDEX IF NOT EXISTS idx_coupons_code
  ON coupons(code) WHERE is_active = true;
```

### FIX 1K — Trigger: Keep Alias Columns in Sync

Since we have both `url`/`public_url`, `color`/`color_name`, `stock_quantity`/`stock_qty`, `total`/`total_amount` — keep them in sync on writes:

```sql
-- product_images: sync url ↔ public_url
CREATE OR REPLACE FUNCTION sync_product_image_url()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.url IS NOT NULL AND NEW.public_url IS NULL THEN
    NEW.public_url = NEW.url;
  END IF;
  IF NEW.public_url IS NOT NULL AND NEW.url IS NULL THEN
    NEW.url = NEW.public_url;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_product_image_url ON product_images;
CREATE TRIGGER trg_sync_product_image_url
  BEFORE INSERT OR UPDATE ON product_images
  FOR EACH ROW EXECUTE FUNCTION sync_product_image_url();

-- product_variants: sync color ↔ color_name and stock_quantity ↔ stock_qty
CREATE OR REPLACE FUNCTION sync_product_variant_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.color IS NOT NULL AND NEW.color_name IS NULL THEN
    NEW.color_name = NEW.color;
  END IF;
  IF NEW.color_name IS NOT NULL AND (NEW.color IS NULL OR NEW.color <> NEW.color_name) THEN
    NEW.color = NEW.color_name;
  END IF;
  IF NEW.stock_quantity IS NOT NULL AND NEW.stock_qty IS NULL THEN
    NEW.stock_qty = NEW.stock_quantity;
  END IF;
  IF NEW.stock_qty IS NOT NULL THEN
    NEW.stock_quantity = NEW.stock_qty;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_variant_fields ON product_variants;
CREATE TRIGGER trg_sync_variant_fields
  BEFORE INSERT OR UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION sync_product_variant_fields();

-- orders: sync total ↔ total_amount
CREATE OR REPLACE FUNCTION sync_order_total()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total IS NOT NULL AND NEW.total_amount IS NULL THEN
    NEW.total_amount = NEW.total;
  END IF;
  IF NEW.total_amount IS NOT NULL THEN
    NEW.total = NEW.total_amount;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_order_total ON orders;
CREATE TRIGGER trg_sync_order_total
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION sync_order_total();
```

### FIX 1L — Verify Final Schema (Run This Last to Confirm)

```sql
-- Final verification query — all these should return rows with data
SELECT 'products columns' AS check,
  string_agg(column_name, ', ' ORDER BY ordinal_position) AS columns
FROM information_schema.columns
WHERE table_name = 'products'
UNION ALL
SELECT 'product_images columns',
  string_agg(column_name, ', ' ORDER BY ordinal_position)
FROM information_schema.columns
WHERE table_name = 'product_images'
UNION ALL
SELECT 'product_variants columns',
  string_agg(column_name, ', ' ORDER BY ordinal_position)
FROM information_schema.columns
WHERE table_name = 'product_variants'
UNION ALL
SELECT 'orders columns',
  string_agg(column_name, ', ' ORDER BY ordinal_position)
FROM information_schema.columns
WHERE table_name = 'orders'
UNION ALL
SELECT 'reviews exists', COUNT(*)::TEXT
FROM information_schema.tables
WHERE table_name = 'reviews'
UNION ALL
SELECT 'order_status_history exists', COUNT(*)::TEXT
FROM information_schema.tables
WHERE table_name = 'order_status_history'
UNION ALL
SELECT 'return_requests exists', COUNT(*)::TEXT
FROM information_schema.tables
WHERE table_name = 'return_requests';
```

---

## FIX 2 — Deploy All 5 Missing Edge Functions

The following 5 edge functions exist in the codebase but are NOT deployed to Supabase. Deploy all of them. The `create-admin-user` and `delete-admin-user` functions should be **skipped** (Admin Management was removed).

### Function 1: `create-order`
**File location in repo:** `supabase/functions/create-order/index.ts`

This is the most critical function. It must:
1. Accept the full order payload from the checkout form
2. Use the **service role key** (bypasses RLS — required for guest checkout)
3. Upsert customer record into the appropriate table
4. Insert the order row with ALL column names matching the actual DB schema:
   - `total` AND `total_amount` (both, via trigger)
   - `shipping_cost` AND `delivery_charge` (both)
   - `discount` AND `discount_amount` (both)
   - Flat shipping fields: `shipping_name`, `shipping_phone`, `shipping_address1`, etc.
   - `customer_email`, `customer_phone`
5. Insert order items into `order_items`
6. Call `decrement_stock` for each variant
7. Increment `used_count` on the coupon if one was applied
8. Insert initial row into `order_status_history`
9. Invoke `send-order-confirmation` (fire and forget)
10. Return `{ success: true, orderNumber, orderId }`

**Critical: The function must write shipping address to BOTH the `shipping_address` JSONB column AND the flat `shipping_name`, `shipping_phone` etc. columns so both old and new code can read it.**

```typescript
// Key insert shape (must include ALL these fields):
await supabase.from('orders').insert({
  // Existing DB columns
  user_id: customerId,
  order_number: null, // auto-generated by trigger
  status: 'pending',
  payment_status: 'pending',
  subtotal: body.pricing.subtotal,
  discount: body.pricing.discount_amount,          // existing col
  discount_amount: body.pricing.discount_amount,   // new alias col
  shipping_cost: body.pricing.delivery_charge,     // existing col
  delivery_charge: body.pricing.delivery_charge,   // new alias col
  total: body.pricing.total_amount,                // existing col
  total_amount: body.pricing.total_amount,         // new alias col
  coupon_code: body.pricing.coupon_code || null,
  coupon_id: body.pricing.coupon_id || null,
  shipping_address: {                              // JSONB for old code
    name: body.customer.name,
    phone: body.customer.phone,
    address1: body.shipping.address1,
    address2: body.shipping.address2,
    city: body.shipping.city,
    state: body.shipping.state,
    pincode: body.shipping.pincode,
  },
  // New flat columns for new code
  shipping_name: body.customer.name,
  shipping_phone: body.customer.phone,
  shipping_address1: body.shipping.address1,
  shipping_address2: body.shipping.address2 || null,
  shipping_landmark: body.shipping.landmark || null,
  shipping_city: body.shipping.city,
  shipping_state: body.shipping.state,
  shipping_pincode: body.shipping.pincode,
  customer_email: body.customer.email,
  customer_phone: body.customer.phone,
  delivery_type: body.delivery_type || 'standard',
})
```

### Function 2: `validate-coupon`
**File location in repo:** `supabase/functions/validate-coupon/index.ts`

Must query the `coupons` table using the **actual column names** from the DB:
- `used_count` (not `usage_count`)
- `max_discount` (not `max_discount_cap`)
- `starts_at` (not `valid_from`)
- `expires_at` (not `valid_until`)

```typescript
// Correct column mapping for coupons table:
const { data: coupon } = await supabase
  .from('coupons')
  .select('id, code, discount_type, discount_value, min_order_amount, max_discount, usage_limit, used_count, starts_at, expires_at, is_active')
  .eq('code', code.toUpperCase())
  .eq('is_active', true)
  .single()

// Check expiry using correct column names:
if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
  return { valid: false, message: 'This coupon has expired' }
}
if (coupon.starts_at && new Date(coupon.starts_at) > new Date()) {
  return { valid: false, message: 'This coupon is not active yet' }
}
if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
  return { valid: false, message: 'This coupon has reached its usage limit' }
}
```

### Function 3: `cancel-order`
**File location in repo:** `supabase/functions/cancel-order/index.ts`

Must:
1. Verify ownership: fetch order by `order_number` + `shipping_phone` (new column)
2. Check status is `pending` or `confirmed`
3. Update `status` = `'cancelled'` on `orders` table
4. Insert into `order_status_history`
5. Call `increment_stock` for each order item's variant

### Function 4: `create-return-request`
**File location in repo:** `supabase/functions/create-return-request/index.ts`

Must insert into `return_requests` table (newly created in FIX 1G). The `return_number` is auto-generated by the DB trigger.

### Function 5: `validate-coupon` (already listed above)

**After deploying all functions, verify in Supabase Dashboard:**
`Dashboard → Edge Functions` — all 5 should show status "Active" with a green indicator.

---

## FIX 3 — Code Fixes (Small, Targeted)

### FIX 3A — `OrderLookup.tsx` — Fix Query Column Names

The order lookup page queries orders with wrong column names. Update the query to use the actual DB columns while also reading new alias columns:

```typescript
// Fix the order lookup query to read from shipping_address JSONB
// OR from the new flat columns (whichever exists):

const { data: order } = await supabase
  .from('orders')
  .select(`
    id,
    order_number,
    status,
    created_at,
    total,
    total_amount,
    shipping_address,
    shipping_name,
    shipping_phone,
    shipping_city,
    shipping_state,
    shipping_pincode,
    delivery_type,
    coupon_code,
    discount,
    discount_amount,
    shipping_cost,
    delivery_charge,
    items:order_items(
      id, product_name, variant_name, quantity, unit_price, total_price
    ),
    history:order_status_history(
      new_status, old_status, note, created_at
    )
  `)
  .eq('order_number', orderNumber.trim().toUpperCase())
  .eq('shipping_phone', phone.trim())
  .single()

// Helper to read shipping name (handles both old JSONB and new flat columns):
const shippingName = order.shipping_name || order.shipping_address?.name
const shippingCity = order.shipping_city || order.shipping_address?.city
```

### FIX 3B — `Dashboard.tsx` — Fix Admin Query Column Names

```typescript
// Fix all references in Dashboard.tsx:
// total_amount → total (or use total_amount which now exists via migration)
// shipping_name → use shipping_address->>'name' for old records
// customer_phone → use shipping_phone or shipping_address->>'phone'

// Updated order query for dashboard:
const { data: orders } = await supabase
  .from('orders')
  .select('id, order_number, total_amount, total, status, created_at, shipping_name, shipping_address, customer_email')
  .order('created_at', { ascending: false })
  .limit(10)

// In the JSX, display:
const displayTotal = order.total_amount ?? order.total
const displayName = order.shipping_name ?? order.shipping_address?.name ?? 'Customer'
```

### FIX 3C — `Orders.tsx` (Admin) — Fix Column Names

Same pattern as Dashboard — update all references:
- `total_amount` → fallback to `total` if null
- `shipping_name` → fallback to `shipping_address->>'name'`
- `customer_phone` → fallback to `shipping_address->>'phone'`

```typescript
// Helper function to extract from order (add to Orders.tsx):
const getOrderDisplay = (order) => ({
  total: order.total_amount ?? order.total ?? 0,
  name: order.shipping_name ?? order.shipping_address?.name ?? '—',
  phone: order.customer_phone ?? order.shipping_address?.phone ?? '—',
  city: order.shipping_city ?? order.shipping_address?.city ?? '—',
})
```

### FIX 3D — `Inventory.tsx` (Admin) — Fix Image Column Name

```typescript
// Fix product images query — use both url and public_url:
const { data: products } = await supabase
  .from('products')
  .select(`
    id, name, slug, price, base_price, sale_price, is_active,
    is_featured, is_new_arrival, is_best_seller, created_at,
    images:product_images(id, url, public_url, is_primary, sort_order),
    category:categories(name)
  `)
  .order('created_at', { ascending: false })

// In JSX, display image:
const imageUrl = product.images?.[0]?.public_url
  ?? product.images?.[0]?.url
  ?? 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=100&q=80'
```

### FIX 3E — `ProductForm.tsx` (Admin) — Fix Write Columns

When saving a product, write to BOTH old and new column names:

```typescript
// Product insert/update — include both old and new column names:
const productData = {
  name: form.name,
  slug: generateSlug(form.name),
  description: form.description,
  category_id: form.categoryId,
  price: form.basePrice,              // existing column
  base_price: form.basePrice,         // new alias column
  sale_price: form.salePrice || null,
  material: form.material || null,
  fit_type: form.fitType || null,
  occasion: form.occasion || null,
  care_instructions: form.careInstructions || null,
  is_active: form.isActive ?? true,
  is_featured: form.isFeatured ?? false,
  is_new_arrival: form.isNewArrival ?? false,
  is_best_seller: form.isBestSeller ?? false,
}

// Product variant insert — include both old and new column names:
const variantData = {
  product_id: productId,
  size: variant.size,
  color: variant.colorName,           // existing column
  color_name: variant.colorName,      // new alias column
  color_hex: variant.colorHex,
  sku: generateSku(productSlug, variant.size, variant.colorName),
  stock_quantity: variant.qty,        // existing column
  stock_qty: variant.qty,             // new alias column
  is_active: true,
}

// Product image insert — include both url and public_url:
const imageData = {
  product_id: productId,
  url: publicUrl,                     // existing column
  public_url: publicUrl,              // new alias column
  is_primary: index === 0,
  sort_order: index,
  color_hex: variant?.colorHex ?? null,
}
```

### FIX 3F — `useProducts.ts` Hook — Fix All Query Column References

This hook drives the entire storefront product display. Fix ALL column references:

```typescript
// Correct query that works with both old and new columns:
const { data } = await supabase
  .from('products')
  .select(`
    id,
    name,
    slug,
    price,
    base_price,
    sale_price,
    discount_percent,
    is_new_arrival,
    is_best_seller,
    is_featured,
    is_active,
    material,
    fit_type,
    occasion,
    care_instructions,
    description,
    category:categories(id, name, slug),
    images:product_images(
      id, url, public_url, is_primary, sort_order, color_hex
    ),
    variants:product_variants(
      id, size, color, color_name, color_hex,
      stock_quantity, stock_qty, is_active
    ),
    reviews(rating)
  `)
  .eq('is_active', true)

// Normalizer — called on every product from DB to standardize fields:
function normalizeProduct(raw) {
  return {
    ...raw,
    base_price: raw.base_price ?? raw.price,
    images: (raw.images ?? []).map(img => ({
      ...img,
      public_url: img.public_url ?? img.url,
    })),
    variants: (raw.variants ?? []).map(v => ({
      ...v,
      color_name: v.color_name ?? v.color,
      stock_qty: v.stock_qty ?? v.stock_quantity,
    })),
  }
}
```

### FIX 3G — `ProductDetail.tsx` — Fix Reviews Query

```typescript
// Wrong: queries non-existent 'reviews' in product join AND uses wrong column names
// Fix: query the separate 'reviews' table directly

// Fetch product:
const { data: product } = await supabase
  .from('products')
  .select(`
    id, name, slug, price, base_price, sale_price, discount_percent,
    description, material, fit_type, occasion, care_instructions,
    category:categories(name, slug),
    images:product_images(url, public_url, is_primary, sort_order, color_hex),
    variants:product_variants(id, size, color, color_name, color_hex, stock_quantity, stock_qty, is_active)
  `)
  .eq('slug', productSlug)
  .eq('is_active', true)
  .single()

// Fetch reviews separately:
const { data: reviews } = await supabase
  .from('reviews')
  .select('id, customer_name, rating, title, body, is_verified, created_at')
  .eq('product_id', product.id)
  .eq('is_approved', true)
  .order('created_at', { ascending: false })
  .limit(20)
```

### FIX 3H — `SizeGuide.tsx` — Replace 2 Remaining Emojis

```typescript
// Line 44: Replace 💡 with Lucide Lightbulb icon
import { Lightbulb, Ruler } from 'lucide-react'

// Instead of: 💡 Pro Tip
<div className="flex items-center gap-2">
  <Lightbulb size={16} className="text-primary" />
  <span>Pro Tip</span>
</div>

// Instead of: 📏 How to Measure
<div className="flex items-center gap-2">
  <Ruler size={16} className="text-primary" />
  <span>How to Measure</span>
</div>
```

### FIX 3I — `AdminSettings.tsx` — Remove Admin User Management Dependencies

The Settings page is behind `RequireMainAdmin` and calls undeployed admin user edge functions. Simplify it:

```typescript
// Remove from AdminSettings.tsx:
// - Any imports of create-admin-user or delete-admin-user
// - Any UI for adding/deleting admin users
// - The RequireMainAdmin wrapper (or make it non-blocking)

// Keep only:
// - Store Info (name, tagline, contact)
// - Delivery Settings (free delivery threshold, charges)
// - Social Links
// - Razorpay placeholder section
```

### FIX 3J — Footer Social Links

```typescript
// Replace href="#" with real placeholder links:
// Until client provides real URLs, use brand-appropriate targets

const socialLinks = [
  {
    icon: InstagramIcon,
    href: 'https://instagram.com',
    label: 'Follow Elara on Instagram'
  },
  {
    icon: FacebookIcon,
    href: 'https://facebook.com',
    label: 'Follow Elara on Facebook'
  },
  {
    icon: YoutubeIcon,
    href: 'https://youtube.com',
    label: 'Elara on YouTube'
  },
]
// Add target="_blank" rel="noopener noreferrer" to all social links
```

---

## FIX 4 — Cart Persistence (Zustand + localStorage)

The cart is lost on page refresh because Zustand has no persistence. Add `persist` middleware:

```typescript
// src/stores/cartStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useCartStore = create(
  persist(
    (set, get) => ({
      // existing store logic unchanged
    }),
    {
      name: 'elara-cart',                      // localStorage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({                // only persist items + coupon
        items: state.items,
        couponApplied: state.couponApplied,
      }),
    }
  )
)
```

---

## FIX 5 — Checklist: Confirm Everything Works Before Testing

After running all SQL migrations and deploying all edge functions, verify in the browser:

```
[ ] Supabase SQL Editor: FIX 1L verification query returns all expected rows
[ ] Supabase Edge Functions: create-order shows "Active"
[ ] Supabase Edge Functions: validate-coupon shows "Active"
[ ] Supabase Edge Functions: cancel-order shows "Active"
[ ] Supabase Edge Functions: create-return-request shows "Active"
[ ] Admin login works: admin@elara.com / Elara@admin_2026 → redirects to /admin
[ ] Admin can add a test category in Inventory (to verify DB write works)
[ ] Admin can add a test product (to verify product creation works)
[ ] Test product appears on /products page (to verify RLS + query works)
[ ] Cart persists after page refresh
```

Only proceed to Part 2 (Testing) once all 10 items above are checked.

---

# PART 2 — TESTING

Once all fixes above are applied and verified, run through both test batches in order.

---

## BATCH 1 — USER FLOW TESTING

Run every test case below in order. Each test case has: **Steps**, **Expected Result**, and **Pass Criteria**.

---

### TEST U-01 — Homepage Loads Correctly

**Steps:**
1. Open the website root URL `/`
2. Observe all sections loading

**Expected:**
- Hero carousel displays with 3 slides, auto-plays every 4 seconds
- Swiping left/right on mobile changes slides
- Category Grid loads real categories from Supabase (not hardcoded)
- "New Arrivals" section shows real products with images
- "Best Sellers" section shows real products in a separate row
- Promotional banner displays
- Lookbook strip displays
- Trust badges display (with SVG icons, no emojis)
- Newsletter section displays
- Footer displays with all links

**Pass Criteria:** All sections visible, no blank sections, no console errors related to data fetching

---

### TEST U-02 — Category Navigation

**Steps:**
1. From homepage, click any category card in the Category Grid
2. Observe the products page

**Expected:**
- URL changes to `/products?category=<slug>`
- Only products from that category are displayed
- Category name shown as page title / breadcrumb
- Product count shown ("Showing X of Y products")

**Pass Criteria:** Category filter applied, correct products shown

---

### TEST U-03 — Products Listing Page & Filters

**Steps:**
1. Navigate to `/products`
2. Apply filter: select Size "M"
3. Apply filter: select a Color swatch
4. Adjust Price Range slider to ₹0–₹1500
5. Select sort: "Price: Low to High"
6. Toggle "New Arrivals" filter
7. Click "Clear All Filters"

**Expected:**
- Each filter actually changes the product list (not just UI state)
- Active filter chips appear below filter bar showing selected filters
- Filter count badge appears on the Filter button (mobile)
- "Clear All Filters" resets everything and shows all products
- Sort order changes product display order

**Pass Criteria:** Every filter triggers a new Supabase query; results change visibly

---

### TEST U-04 — Product Detail Page

**Steps:**
1. Click any product card to open its detail page
2. Check image gallery
3. Select a different color swatch
4. Observe what changes
5. Select a size
6. Change quantity to 2
7. Click "Add to Cart"

**Expected:**
- Image gallery displays product images
- Selecting a different color: gallery updates to show that color's images (or neutral images if no color-specific ones)
- Available sizes update based on selected color
- Out-of-stock sizes shown greyed with strikethrough
- Quantity selector works (min 1, max 10)
- "Add to Cart" toast appears: "Added to cart!"
- Cart icon badge increments by quantity

**Pass Criteria:** Color switching updates images; cart updates correctly

---

### TEST U-05 — Product Reviews

**Steps:**
1. Open any product detail page
2. Scroll to Reviews section
3. Check existing reviews display
4. Click "Write a Review"
5. Submit without filling required fields
6. Fill in: Name "Test User", Rating 4 stars, Review body "Great product!"
7. Submit the review

**Expected:**
- If no reviews: shows "No reviews yet" (no 0-star display)
- Write a Review form opens
- Validation errors show on empty submit
- After valid submit: success toast, review appears in list
- Star count and average rating recalculates correctly
- Product card star rating also updates (on next page load)

**Pass Criteria:** Review submitted to `reviews` table; rating stats recalculate correctly

---

### TEST U-06 — Search Functionality

**Steps:**
1. Click the search icon in the navbar (or bottom nav on mobile)
2. Type "dress" in the search input
3. Wait 300ms for debounce
4. Observe results

**Expected:**
- Search overlay opens full-screen
- Results appear showing products matching the query
- Clicking a result navigates to that product's detail page
- Pressing ESC or clicking X closes the overlay

**Pass Criteria:** Search returns real products from Supabase, not blank

---

### TEST U-07 — Cart Operations

**Steps:**
1. Add 2 different products to cart (different sizes/colors)
2. Open cart page `/cart`
3. Change quantity of first item to 3
4. Remove the second item
5. Refresh the page

**Expected:**
- Both items appear in cart with correct details (name, size, color, price)
- Quantity change updates line total and order summary total instantly
- Remove item removes it from cart
- **After refresh: cart items are still there** (Zustand persistence)
- Order summary: subtotal, delivery charge, total all calculated correctly

**Pass Criteria:** Cart persists on refresh; totals calculate correctly

---

### TEST U-08 — Coupon Code

**Steps:**
1. Add a product to cart
2. Go to `/cart`
3. Enter an invalid coupon code: "FAKECODE"
4. Enter a valid coupon code (use one created in admin coupons, e.g. "ELARA10")
5. Note the discounted total
6. Remove the coupon

**Expected:**
- Invalid code: error message "Invalid or expired coupon code"
- Valid code: success message "Coupon applied! You save ₹X", discount shown in order summary
- Total recalculates with discount applied
- Remove coupon restores original total

**Pass Criteria:** `validate-coupon` Edge Function responds correctly; discount applies to total

---

### TEST U-09 — Checkout Form

**Steps:**
1. Add a product to cart
2. Proceed to checkout
3. Try submitting empty form
4. Fill all fields with test data:
   - Name: Test Customer
   - Email: test@example.com
   - Phone: 9876543210
   - Address: 123 Test Street, Apartment 4
   - Landmark: Near Test Park
   - City: Mumbai
   - State: Maharashtra
   - PIN: 400001
5. Select Express Delivery
6. Observe order summary

**Expected:**
- Empty submit shows inline validation errors on all required fields
- Invalid phone (fewer than 10 digits) shows error
- Invalid PIN (fewer than 6 digits) shows error
- All states available in state dropdown (all Indian states)
- Selecting Express Delivery updates delivery charge in order summary
- Order summary is collapsible on mobile

**Pass Criteria:** All validations work; form is fillable; order summary accurate

---

### TEST U-10 — Place Order (Critical Path)

**Steps:**
1. Complete checkout form (Test U-09)
2. Click "Place Order"
3. Observe the result

**Expected:**
- Loading state shown on button (spinner)
- Navigates to `/checkout/success?order=ORD-2026-XXXXX`
- Order success page shows: order number, items ordered, total, delivery address, estimated date
- Cart is cleared (empty after navigating to cart)
- Cart badge shows 0

**Pass Criteria:** `create-order` Edge Function returns success; order number displayed; cart cleared

---

### TEST U-11 — Order Confirmation Email

**Steps:**
1. After placing an order (Test U-10), check the inbox of the email used at checkout
2. Open the confirmation email

**Expected:**
- Email arrives within 2 minutes
- Subject: "Order Confirmed — ORD-2026-XXXXX | Elara"
- Email shows: order number, all items with sizes and colors, total breakdown, shipping address, "Track My Order" button

**Pass Criteria:** Email delivered; all order details correct in email body

---

### TEST U-12 — Order Tracking

**Steps:**
1. Navigate to `/account/orders`
2. Enter the order number from Test U-10
3. Enter the phone number used at checkout
4. Click "Find My Order"

**Expected:**
- Order details load: items, total, shipping address
- Order status timeline shows "Order Placed" as completed step
- Status badge shows "Pending"
- "Cancel Order" button is visible (order is in pending status)

**Pass Criteria:** Order found by number + phone; timeline renders correctly

---

### TEST U-13 — Cancel Order

**Steps:**
1. From order detail (Test U-12), click "Cancel Order"
2. Select reason: "Changed my mind"
3. Click "Keep Order" first — verify modal closes without action
4. Click "Cancel Order" again
5. Select reason and click "Confirm Cancellation"

**Expected:**
- Confirmation modal opens on Cancel click
- "Keep Order" closes modal — order status unchanged
- After confirmation: status badge changes to "Cancelled"
- "Cancel Order" button disappears
- Toast: "Order cancelled successfully"
- Verify in admin panel: order shows as Cancelled

**Pass Criteria:** `cancel-order` Edge Function works; status updates in DB; button disappears

---

### TEST U-14 — Return Order Request

**Steps:**
1. Navigate to `/returns/request`
2. Enter a delivered order number and phone (must use an order that has `status = 'delivered'` — update one via admin panel first)
3. Select the item to return
4. Select "Return & Refund" type
5. Select reason: "Size doesn't fit"
6. Click "Submit Return Request"

**Expected:**
- Order found and displayed with items
- Item checkboxes selectable
- After submit: success screen with Return ID (RET-2026-XXXXX)
- Return request appears in admin `/admin/returns`

**Pass Criteria:** Return request created in `return_requests` table; return number generated

---

### TEST U-15 — Static Pages

**Steps:**
Navigate to each of these pages and verify they load without errors:
1. `/about`
2. `/contact`
3. `/faq`
4. `/size-guide` — verify NO emoji characters (replaced with SVG icons)
5. `/returns`
6. `/shipping`
7. `/privacy-policy`
8. `/terms`
9. `/support`

**Expected:**
- All pages load with content
- No broken layouts
- SizeGuide: uses Lightbulb and Ruler SVG icons, no 💡📏 emojis
- FAQ: accordion expand/collapse works
- Contact: form submits to `support_tickets` table

**Pass Criteria:** All 9 pages render; no emojis in SizeGuide; contact form submits

---

### TEST U-16 — Mobile Responsiveness

**Steps:**
Test the following on a 390px-wide viewport (iPhone 14 Pro equivalent):
1. Homepage — all sections visible, carousel full-width
2. Products page — 2-column grid
3. Product detail — sticky Add to Cart bar at bottom
4. Cart — swipe-to-delete on items
5. Bottom nav bar — all 4 tabs functional
6. Hamburger menu — all links present and working

**Expected:**
- No horizontal overflow on any page
- Bottom nav shows 4 tabs: Home, Search, Cart (with badge), Account
- Hamburger menu links: Home, Shop All, New Arrivals, Best Sellers, Sale, Track My Order, Returns, Contact Us, About Us
- Touch targets all ≥ 44×44px
- Product grid is 2 columns (not 1, not 3)

**Pass Criteria:** No layout breaks at 390px; all navigation functional

---

## BATCH 2 — ADMIN FLOW TESTING

---

### TEST A-01 — Admin Login

**Steps:**
1. Navigate to `/admin/login`
2. Try wrong password: admin@elara.com + "wrongpassword"
3. Try correct credentials: admin@elara.com / Elara@admin_2026

**Expected:**
- Wrong credentials: error message displayed ("Invalid credentials")
- Correct credentials: redirects to `/admin` dashboard
- Admin name "Abu" shown in sidebar
- No "Admin Management" link in sidebar (was removed)
- Sidebar links: Dashboard, Orders, Inventory, Coupons, Returns, Settings

**Pass Criteria:** Login works; Admin Management removed; correct nav links

---

### TEST A-02 — Dashboard

**Steps:**
1. Login and observe dashboard at `/admin`
2. Click each duration: Today, This Week, This Month, This Year, Lifetime
3. Observe charts

**Expected:**
- KPI cards display (Total Revenue, Total Orders, Avg Order Value, New Customers)
- Revenue line chart renders with data (or empty state for zero data)
- Order status donut chart renders
- Top Products bar chart renders
- Duration selector switches data
- Recent Orders table shows real orders (not blank)
- Low Stock widget (shows if any variants have stock ≤ 5)

**Pass Criteria:** All 4 chart types render; duration selector works; no crash on empty data

---

### TEST A-03 — Add a Category

**Steps:**
1. Go to `/admin/inventory`
2. Look for category management (settings or inventory page)
3. Add a new category: Name "Casual Wear", Slug "casual", upload an image

**Expected:**
- Category saved to `categories` table
- Category appears in CategoryGrid on homepage
- Category available in product form dropdown

**Pass Criteria:** Category created; visible on storefront

---

### TEST A-04 — Add a Product (Full 4-Step Form)

**Steps:**
1. Go to `/admin/inventory/new`
2. Step 1: Fill name "Test Floral Dress", select category "Casual Wear", add description, material "Rayon", fit "Regular Fit", select occasions "Casual", care instructions
3. Toggle: is_new_arrival ON, is_active ON
4. Step 2: Set base price ₹1299, sale price ₹899
5. Step 3: Upload a product image (use any JPEG/PNG)
6. Verify compression: image should show "< 50KB | WebP" after compression
7. Step 4: Add color "Blush Pink" (#F8BBD0). Add sizes S, M, L with quantities 10, 15, 8
8. Click "Save & Publish"

**Expected:**
- Step navigation works (Next/Back buttons)
- Image compression runs on upload, shows original size → compressed size → WebP format
- Stock matrix generates automatically for each size × color combination
- Product saves to Supabase
- Redirects to inventory list
- Product visible in inventory list immediately
- Product visible on storefront `/products` immediately
- Product visible in New Arrivals section on homepage

**Pass Criteria:** Product created; compression < 50KB; visible on storefront; in New Arrivals

---

### TEST A-05 — Edit a Product

**Steps:**
1. From inventory list, click Edit on the product created in A-04
2. Change the name to "Test Floral Dress — Edited"
3. Change sale price to ₹799
4. Upload a second image
5. Save

**Expected:**
- Edit form loads with all existing data pre-filled
- Changes save correctly
- Updated name and price visible in inventory list
- Updated price visible on storefront product card
- Discount percent recalculates automatically

**Pass Criteria:** Edit saves correctly; storefront reflects changes

---

### TEST A-06 — Toggle Product Active/Inactive

**Steps:**
1. In inventory list, click the Active toggle on the test product to make it Inactive
2. Navigate to storefront `/products`
3. Toggle it back to Active
4. Navigate to storefront `/products` again

**Expected:**
- When Inactive: product does NOT appear on storefront (RLS blocks public read)
- When Active: product appears on storefront

**Pass Criteria:** is_active toggle correctly controls storefront visibility

---

### TEST A-07 — View Order in Admin Panel

**Steps:**
1. Go to `/admin/orders`
2. Verify the order placed in Test U-10 appears in the list
3. Click the order to open detail view

**Expected:**
- Order appears in list with correct: order number, customer name, total, status "Pending"
- Order detail shows: all items with images/sizes/colors, shipping address, price breakdown
- Status timeline shows "Order Placed" entry
- Order status can be changed (e.g. from Pending → Confirmed)

**Pass Criteria:** Order visible; detail correct; status update works

---

### TEST A-08 — Update Order Status

**Steps:**
1. Open the test order from A-07
2. Change status to "Confirmed"
3. Add admin note: "Payment verified, preparing for dispatch"
4. Save the status change

**Expected:**
- Status updates in DB
- Status badge on order card changes to "Confirmed" (blue)
- Status change appears in order timeline with timestamp
- "Cancel Order" button on customer side (`/account/orders`) disappears for this order when it reaches "Shipped" or beyond

**Pass Criteria:** Status change logged in `order_status_history`; timeline updates

---

### TEST A-09 — Search & Filter Orders

**Steps:**
1. In `/admin/orders`, search for the test order number (ORD-2026-00001)
2. Filter by status: "Pending"
3. Filter by status: "Confirmed"
4. Clear filters

**Expected:**
- Search finds order by partial order number
- Status filter correctly narrows the list
- Clearing filters restores full list

**Pass Criteria:** Search and filters work correctly

---

### TEST A-10 — Coupon Management

**Steps:**
1. Go to `/admin/coupons`
2. Create a new coupon:
   - Code: ELARA10
   - Type: Percentage (10%)
   - Min Order: ₹500
   - Max Discount Cap: ₹200
   - Usage Limit: 50
   - Valid Until: 1 year from today
3. Save coupon
4. Go to storefront cart (with item worth ₹600+) and apply ELARA10
5. Back in admin, verify used_count incremented to 1

**Expected:**
- Coupon created and visible in coupons list
- Coupon applies correctly on storefront (10% off, capped at ₹200)
- After use: used_count shows 1 in admin coupon list

**Pass Criteria:** Full coupon lifecycle works end-to-end

---

### TEST A-11 — Returns Management

**Steps:**
1. Go to `/admin/returns`
2. Search for the customer name used in Test U-14 (e.g. "Test Customer")
3. Open the return request
4. Change status to "Approved"
5. Add admin note: "Pickup scheduled for tomorrow"
6. Enter refund amount

**Expected:**
- Search finds the return request by customer name / order number / phone
- Return detail shows: items, reason, return type, any uploaded photos
- Status can be updated (Requested → Approved → etc.)
- Admin note saves
- Refund amount saves

**Pass Criteria:** Return request manageable by admin; status updates persist

---

### TEST A-12 — Admin Session Persistence

**Steps:**
1. Login as admin
2. Navigate to dashboard
3. Close the browser tab
4. Re-open the admin URL `/admin`

**Expected:**
- Admin is still logged in (session persists)
- Does NOT redirect to login page
- Admin name and role still shown in sidebar

**Pass Criteria:** Auth session persists across tab close/reopen

---

### TEST A-13 — Admin Logout

**Steps:**
1. Click "Logout" in the sidebar
2. Try to navigate to `/admin`

**Expected:**
- Redirects to `/admin/login`
- Cannot access any admin page without logging in again

**Pass Criteria:** Logout clears session; protected routes redirect to login

---

## Summary — All Tests

| ID | Test | Flow | Priority |
|---|---|---|---|
| U-01 | Homepage loads correctly | User | High |
| U-02 | Category navigation | User | High |
| U-03 | Products page & filters | User | Critical |
| U-04 | Product detail & color switching | User | Critical |
| U-05 | Product reviews | User | High |
| U-06 | Search | User | Medium |
| U-07 | Cart operations + persistence | User | Critical |
| U-08 | Coupon code | User | High |
| U-09 | Checkout form validation | User | Critical |
| U-10 | Place order (end-to-end) | User | Critical |
| U-11 | Order confirmation email | User | High |
| U-12 | Order tracking | User | High |
| U-13 | Cancel order | User | High |
| U-14 | Return order request | User | High |
| U-15 | Static pages + emoji fix | User | Medium |
| U-16 | Mobile responsiveness | User | High |
| A-01 | Admin login | Admin | Critical |
| A-02 | Dashboard charts | Admin | High |
| A-03 | Add category | Admin | High |
| A-04 | Add product (full flow) | Admin | Critical |
| A-05 | Edit product | Admin | High |
| A-06 | Toggle active/inactive | Admin | High |
| A-07 | View order in admin | Admin | Critical |
| A-08 | Update order status | Admin | Critical |
| A-09 | Search & filter orders | Admin | Medium |
| A-10 | Coupon lifecycle | Admin | High |
| A-11 | Returns management | Admin | High |
| A-12 | Admin session persistence | Admin | Medium |
| A-13 | Admin logout | Admin | Medium |

**Total: 29 test cases — 16 User, 13 Admin**

---

## Implementation & Execution Order

```
Day 1 — All SQL Migrations (FIX 1A through 1K in exact order)
         Run FIX 1L verification — confirm all checks pass

Day 2 — Deploy all 5 Edge Functions
         Verify all show "Active" in Supabase Dashboard

Day 3 — Code Fixes (FIX 3A through 3J)
         Run FIX 5 pre-test checklist — all 10 items must pass

Day 4 — BATCH 1: User Flow Tests (U-01 through U-16)
         Log any failures — fix before proceeding

Day 5 — BATCH 2: Admin Flow Tests (A-01 through A-13)
         Log any failures — fix after completing all tests

Day 6 — Fix any failures found in testing
         Re-run failed tests only
         Final sign-off
```

---

*This PRD is self-contained. The SQL migrations in Part 1 are the absolute prerequisite — nothing in Part 2 will pass until the schema is aligned. Pass this document to Lovable along with all previous phase PRDs for full context.*
