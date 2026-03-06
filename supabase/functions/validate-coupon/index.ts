import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { code, order_amount, customer_email } = await req.json();
    if (!code) throw new Error("Coupon code is required");

    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code.toUpperCase())
      .eq("is_active", true)
      .single();

    if (error || !coupon) {
      return new Response(JSON.stringify({ valid: false, message: "Invalid coupon code" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();

    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return new Response(JSON.stringify({ valid: false, message: "This coupon has expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(coupon.valid_from) > now) {
      return new Response(JSON.stringify({ valid: false, message: "This coupon is not active yet" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order_amount < Number(coupon.min_order_amount)) {
      return new Response(JSON.stringify({ valid: false, message: `Minimum order of ₹${coupon.min_order_amount} required` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return new Response(JSON.stringify({ valid: false, message: "Coupon usage limit reached" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Per-user limit check
    if (customer_email && coupon.per_user_limit) {
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("coupon_code", code.toUpperCase())
        .eq("customer_email", customer_email);

      if (count !== null && count >= coupon.per_user_limit) {
        return new Response(JSON.stringify({ valid: false, message: "You have already used this coupon" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let discount = 0;
    if (coupon.discount_type === "flat") {
      discount = Math.min(Number(coupon.discount_value), order_amount);
    } else {
      discount = (order_amount * Number(coupon.discount_value)) / 100;
      if (coupon.max_discount_cap) discount = Math.min(discount, Number(coupon.max_discount_cap));
    }

    discount = Math.round(discount);

    return new Response(JSON.stringify({
      valid: true,
      couponId: coupon.id,
      discountType: coupon.discount_type,
      discountValue: Number(coupon.discount_value),
      maxCap: coupon.max_discount_cap,
      discountAmount: discount,
      message: `Coupon applied! You save ₹${discount}`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ valid: false, message: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
