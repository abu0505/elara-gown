
-- Fix search_path on stock functions
CREATE OR REPLACE FUNCTION decrement_stock(p_variant_id UUID, p_quantity INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE product_variants
  SET stock_qty = GREATEST(0, stock_qty - p_quantity), updated_at = now()
  WHERE id = p_variant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION increment_stock(p_variant_id UUID, p_quantity INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE product_variants
  SET stock_qty = stock_qty + p_quantity, updated_at = now()
  WHERE id = p_variant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
