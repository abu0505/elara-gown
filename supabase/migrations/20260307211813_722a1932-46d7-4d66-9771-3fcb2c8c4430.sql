
-- Phase 4 Migration: return_number, color_hex on images, review columns, rating stats, RLS fix

-- 1. Add return_number to return_requests
CREATE SEQUENCE IF NOT EXISTS public.return_seq START WITH 1;

ALTER TABLE public.return_requests ADD COLUMN IF NOT EXISTS return_number TEXT;

CREATE OR REPLACE FUNCTION public.generate_return_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.return_number = 'RET-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                      LPAD(nextval('public.return_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_return_number'
  ) THEN
    CREATE TRIGGER set_return_number
      BEFORE INSERT ON public.return_requests
      FOR EACH ROW
      WHEN (NEW.return_number IS NULL)
      EXECUTE FUNCTION public.generate_return_number();
  END IF;
END;
$$;

-- 2. Add color_hex to product_images
ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS color_hex TEXT;

-- 3. Add missing review columns
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Make reviewer_name nullable since we now have customer_name
ALTER TABLE public.reviews ALTER COLUMN reviewer_name DROP NOT NULL;

-- 4. Rating stats function
CREATE OR REPLACE FUNCTION public.get_product_rating_stats(p_product_id UUID)
RETURNS TABLE(avg_rating NUMERIC, review_count BIGINT, stars_1 BIGINT, stars_2 BIGINT, stars_3 BIGINT, stars_4 BIGINT, stars_5 BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COALESCE(ROUND(AVG(rating)::NUMERIC, 1), 0) AS avg_rating,
    COUNT(*) AS review_count,
    COUNT(*) FILTER (WHERE rating = 1) AS stars_1,
    COUNT(*) FILTER (WHERE rating = 2) AS stars_2,
    COUNT(*) FILTER (WHERE rating = 3) AS stars_3,
    COUNT(*) FILTER (WHERE rating = 4) AS stars_4,
    COUNT(*) FILTER (WHERE rating = 5) AS stars_5
  FROM public.reviews
  WHERE product_id = p_product_id AND is_approved = true;
$$;

-- 5. Index on reviews
CREATE INDEX IF NOT EXISTS idx_reviews_product_approved ON public.reviews(product_id, is_approved, created_at DESC);

-- 6. Fix RLS: add permissive INSERT policy for reviews (guests can submit)
DROP POLICY IF EXISTS "reviews_public_insert" ON public.reviews;
CREATE POLICY "reviews_public_insert" ON public.reviews FOR INSERT WITH CHECK (true);

-- 7. Wipe all dummy data
TRUNCATE public.order_status_history CASCADE;
TRUNCATE public.order_items CASCADE;
TRUNCATE public.return_requests CASCADE;
TRUNCATE public.orders CASCADE;
TRUNCATE public.reviews CASCADE;
TRUNCATE public.product_images CASCADE;
TRUNCATE public.product_variants CASCADE;
TRUNCATE public.products CASCADE;
TRUNCATE public.customers CASCADE;
TRUNCATE public.addresses CASCADE;
TRUNCATE public.support_tickets CASCADE;

-- Reset sequences
ALTER SEQUENCE IF EXISTS public.order_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS public.ticket_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS public.return_seq RESTART WITH 1;
