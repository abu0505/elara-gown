
-- Phase 3 Migration: return_requests table, stock functions, performance indexes

-- 1. Create return_requests table
CREATE TABLE IF NOT EXISTS return_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id   UUID REFERENCES order_items(id),
  reason          TEXT NOT NULL,
  reason_detail   TEXT,
  return_type     TEXT NOT NULL DEFAULT 'return' CHECK (return_type IN ('return', 'exchange')),
  exchange_size   TEXT,
  status          TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','pickup_scheduled','picked_up','received','refund_initiated','refunded','rejected')),
  images          TEXT[],
  admin_note      TEXT,
  refund_amount   NUMERIC(10,2),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- RLS for return_requests
CREATE POLICY "return_requests_public_insert" ON return_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "return_requests_public_read" ON return_requests FOR SELECT USING (true);
CREATE POLICY "return_requests_admin_all" ON return_requests FOR ALL USING (is_admin(auth.uid()));

-- 2. Stock management functions
CREATE OR REPLACE FUNCTION decrement_stock(p_variant_id UUID, p_quantity INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE product_variants
  SET stock_qty = GREATEST(0, stock_qty - p_quantity), updated_at = now()
  WHERE id = p_variant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_stock(p_variant_id UUID, p_quantity INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE product_variants
  SET stock_qty = stock_qty + p_quantity, updated_at = now()
  WHERE id = p_variant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_active = true AND is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_new_arrival ON products(is_new_arrival, created_at DESC) WHERE is_active = true AND is_new_arrival = true;
CREATE INDEX IF NOT EXISTS idx_products_best_seller ON products(is_best_seller) WHERE is_active = true AND is_best_seller = true;
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(shipping_phone);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code) WHERE is_active = true;
