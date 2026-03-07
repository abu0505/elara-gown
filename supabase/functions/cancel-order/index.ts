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

    const { orderId, phone, reason } = await req.json();

    if (!orderId || !phone) throw new Error("Order ID and phone are required");

    // Verify ownership
    const { data: order } = await supabase
      .from("orders")
      .select("id, status, shipping_phone, customer_phone")
      .eq("id", orderId)
      .single();

    if (!order) {
      return new Response(JSON.stringify({ success: false, message: "Order not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check phone matches either field
    const phoneClean = phone.replace(/\D/g, "").slice(-10);
    const shippingClean = (order.shipping_phone || "").replace(/\D/g, "").slice(-10);
    const customerClean = (order.customer_phone || "").replace(/\D/g, "").slice(-10);

    if (phoneClean !== shippingClean && phoneClean !== customerClean) {
      return new Response(JSON.stringify({ success: false, message: "Phone number does not match" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["pending", "confirmed"].includes(order.status)) {
      return new Response(JSON.stringify({ success: false, message: "This order cannot be cancelled at this stage" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status
    await supabase
      .from("orders")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", orderId);

    // Log status change
    await supabase.from("order_status_history").insert({
      order_id: orderId,
      old_status: order.status,
      new_status: "cancelled",
      note: `Cancelled by customer. Reason: ${reason || "Not specified"}`,
    });

    // Restore stock
    const { data: items } = await supabase
      .from("order_items")
      .select("variant_id, quantity")
      .eq("order_id", orderId);

    for (const item of items || []) {
      if (item.variant_id) {
        await supabase.rpc("increment_stock", {
          p_variant_id: item.variant_id,
          p_quantity: item.quantity,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, message: "Order cancelled successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
