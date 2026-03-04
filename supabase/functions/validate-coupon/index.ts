import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { code, order_amount } = await req.json();
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

    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      return new Response(JSON.stringify({ valid: false, message: "Coupon has expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return new Response(JSON.stringify({ valid: false, message: "Coupon usage limit reached" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order_amount < Number(coupon.min_order_amount)) {
      return new Response(JSON.stringify({ valid: false, message: `Minimum order ₹${coupon.min_order_amount} required` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let discount = 0;
    if (coupon.discount_type === "flat") {
      discount = Number(coupon.discount_value);
    } else {
      discount = (order_amount * Number(coupon.discount_value)) / 100;
      if (coupon.max_discount_cap) discount = Math.min(discount, Number(coupon.max_discount_cap));
    }

    return new Response(JSON.stringify({
      valid: true, discount_type: coupon.discount_type, discount_value: Number(coupon.discount_value),
      max_cap: coupon.max_discount_cap, calculated_discount: Math.round(discount),
      message: `Coupon applied! You save ₹${Math.round(discount)}`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ valid: false, message: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
