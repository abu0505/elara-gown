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

    const body = await req.json();
    const { customer, shipping, items, pricing, delivery_type } = body;

    if (!customer?.name || !customer?.email || !customer?.phone) {
      throw new Error("Customer info is required");
    }
    if (!shipping?.address1 || !shipping?.city || !shipping?.state || !shipping?.pincode) {
      throw new Error("Shipping address is required");
    }
    if (!items || items.length === 0) {
      throw new Error("Order must have at least one item");
    }

    // 1. Upsert customer
    let customerId: string | null = null;
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("email", customer.email)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      await supabase.from("customers").update({ name: customer.name, phone: customer.phone }).eq("id", customerId);
    } else {
      const { data: newCustomer, error: custErr } = await supabase
        .from("customers")
        .insert({ name: customer.name, email: customer.email, phone: customer.phone })
        .select("id")
        .single();
      if (custErr) throw new Error("Failed to create customer: " + custErr.message);
      customerId = newCustomer!.id;
    }

    // 2. Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id: customerId,
        customer_email: customer.email,
        customer_phone: customer.phone,
        shipping_name: shipping.name || customer.name,
        shipping_phone: customer.phone,
        shipping_address1: shipping.address1,
        shipping_address2: shipping.address2 || null,
        shipping_landmark: shipping.landmark || null,
        shipping_city: shipping.city,
        shipping_state: shipping.state,
        shipping_pincode: shipping.pincode,
        subtotal: pricing.subtotal,
        discount_amount: pricing.discount_amount || 0,
        delivery_charge: pricing.delivery_charge || 0,
        total_amount: pricing.total_amount,
        coupon_code: pricing.coupon_code || null,
        coupon_id: pricing.coupon_id || null,
        delivery_type: delivery_type || "standard",
        status: "pending",
        payment_status: "pending",
        payment_method: "cod",
      })
      .select("id, order_number")
      .single();

    if (orderError) {
      throw new Error("Failed to create order: " + orderError.message);
    }

    // 3. Insert order items
    const orderItems = items.map((item: any) => ({
      order_id: order!.id,
      product_id: item.product_id || null,
      variant_id: item.variant_id || null,
      product_name: item.product_name,
      product_image: item.product_image,
      size: item.size,
      color_name: item.color_name,
      color_hex: item.color_hex || "#000000",
      unit_price: item.unit_price,
      quantity: item.quantity,
      line_total: item.line_total,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
    if (itemsError) {
      console.error("Failed to insert order items:", itemsError);
    }

    // 4. Decrement stock for variants
    for (const item of items) {
      if (item.variant_id) {
        await supabase.rpc("decrement_stock", {
          p_variant_id: item.variant_id,
          p_quantity: item.quantity,
        });
      }
    }

    // 5. Increment coupon usage
    if (pricing.coupon_id) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("usage_count")
        .eq("id", pricing.coupon_id)
        .single();
      if (coupon) {
        await supabase
          .from("coupons")
          .update({ usage_count: (coupon.usage_count || 0) + 1 })
          .eq("id", pricing.coupon_id);
      }
    }

    // 6. Log initial status
    await supabase.from("order_status_history").insert({
      order_id: order!.id,
      new_status: "pending",
      note: "Order placed by customer",
    });

    // 7. Fire-and-forget order confirmation email
    try {
      const shippingAddr = `${shipping.address1}${shipping.address2 ? ', ' + shipping.address2 : ''}, ${shipping.city}, ${shipping.state} — ${shipping.pincode}`;
      await supabase.functions.invoke("send-order-confirmation", {
        body: {
          orderNumber: order!.order_number,
          customerEmail: customer.email,
          customerName: customer.name,
          items: orderItems,
          totalAmount: pricing.total_amount,
          shippingAddress: shippingAddr,
        },
      });
    } catch (emailErr) {
      console.error("Email send failed (non-blocking):", emailErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderNumber: order!.order_number,
        orderId: order!.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("create-order error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
