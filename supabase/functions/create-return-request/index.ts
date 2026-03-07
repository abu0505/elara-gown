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

    const { orderId, phone, items: returnItems, returnType, reason, reasonDetail, exchangeSize } = await req.json();

    if (!orderId || !phone || !reason) throw new Error("Missing required fields");

    // Verify order ownership
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

    const phoneClean = phone.replace(/\D/g, "").slice(-10);
    const shippingClean = (order.shipping_phone || "").replace(/\D/g, "").slice(-10);
    const customerClean = (order.customer_phone || "").replace(/\D/g, "").slice(-10);

    if (phoneClean !== shippingClean && phoneClean !== customerClean) {
      return new Response(JSON.stringify({ success: false, message: "Phone number does not match" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.status !== "delivered") {
      return new Response(JSON.stringify({ success: false, message: "Returns can only be initiated for delivered orders" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check 7-day window
    const { data: deliveredHistory } = await supabase
      .from("order_status_history")
      .select("created_at")
      .eq("order_id", orderId)
      .eq("new_status", "delivered")
      .order("created_at", { ascending: false })
      .limit(1);

    if (deliveredHistory && deliveredHistory.length > 0) {
      const deliveredDate = new Date(deliveredHistory[0].created_at);
      const daysSinceDelivery = (Date.now() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDelivery > 7) {
        return new Response(JSON.stringify({ success: false, message: "Return window of 7 days has expired" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Create return requests for each item
    const results = [];
    const itemIds = returnItems || [null];

    for (const itemId of itemIds) {
      const { data: returnReq, error } = await supabase
        .from("return_requests")
        .insert({
          order_id: orderId,
          order_item_id: itemId || null,
          reason,
          reason_detail: reasonDetail || null,
          return_type: returnType || "return",
          exchange_size: exchangeSize || null,
          status: "requested",
        })
        .select("id")
        .single();

      if (error) throw new Error("Failed to create return request: " + error.message);
      results.push(returnReq);
    }

    // Update order status
    await supabase
      .from("orders")
      .update({ status: "returned", updated_at: new Date().toISOString() })
      .eq("id", orderId);

    await supabase.from("order_status_history").insert({
      order_id: orderId,
      old_status: "delivered",
      new_status: "returned",
      note: `Return request initiated by customer. Reason: ${reason}`,
    });

    return new Response(JSON.stringify({ success: true, returnIds: results.map(r => r!.id) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
