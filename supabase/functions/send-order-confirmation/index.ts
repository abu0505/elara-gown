import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { orderNumber, customerEmail, customerName, items, totalAmount, shippingAddress } = await req.json();

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("FROM_EMAIL") || "orders@elara.com";
    const siteUrl = Deno.env.get("SITE_URL") || "https://elara-gown.lovable.app";

    if (!resendKey) {
      console.log("RESEND_API_KEY not configured, skipping email");
      return new Response(JSON.stringify({ success: false, message: "Email not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!customerEmail) {
      return new Response(JSON.stringify({ success: false, message: "No customer email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const itemsHtml = (items || []).map((item: any) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">
          <img src="${item.product_image}" width="48" height="48" style="border-radius:4px;object-fit:cover;" alt="${item.product_name}" />
        </td>
        <td style="padding:8px;border-bottom:1px solid #eee;font-family:Inter,sans-serif;font-size:14px;">
          ${item.product_name}<br/>
          <span style="color:#666;font-size:12px;">${item.size} / ${item.color_name} × ${item.quantity}</span>
        </td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:Inter,sans-serif;font-size:14px;font-weight:600;">
          ₹${Number(item.line_total).toLocaleString()}
        </td>
      </tr>
    `).join("");

    const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f9f9f9;font-family:Inter,sans-serif;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;margin-top:20px;margin-bottom:20px;">
        <div style="background:#C2185B;padding:24px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-family:'Playfair Display',serif;font-size:28px;">Elara</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="margin:0 0 8px;font-family:'Playfair Display',serif;color:#333;font-size:22px;">Order Confirmed! 🎉</h2>
          <p style="color:#666;font-size:14px;margin:0 0 24px;">Hi ${customerName || "there"}, your order has been placed successfully.</p>
          
          <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin-bottom:24px;">
            <p style="margin:0;font-size:12px;color:#666;">Order Number</p>
            <p style="margin:4px 0 0;font-size:16px;font-weight:700;font-family:monospace;color:#C2185B;">${orderNumber}</p>
          </div>

          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr>
                <th style="padding:8px;text-align:left;border-bottom:2px solid #eee;font-size:12px;color:#666;"></th>
                <th style="padding:8px;text-align:left;border-bottom:2px solid #eee;font-size:12px;color:#666;">Item</th>
                <th style="padding:8px;text-align:right;border-bottom:2px solid #eee;font-size:12px;color:#666;">Amount</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <div style="text-align:right;margin-top:16px;">
            <p style="font-size:18px;font-weight:700;color:#333;">Total: ₹${Number(totalAmount).toLocaleString()}</p>
          </div>

          ${shippingAddress ? `
          <div style="margin-top:24px;padding:16px;background:#f5f5f5;border-radius:8px;">
            <p style="margin:0;font-size:12px;color:#666;">Delivering to</p>
            <p style="margin:4px 0 0;font-size:14px;color:#333;">${shippingAddress}</p>
          </div>
          ` : ""}

          <div style="text-align:center;margin-top:32px;">
            <a href="${siteUrl}/account/orders" style="display:inline-block;background:#C2185B;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">Track Your Order</a>
          </div>
        </div>
        <div style="padding:16px;text-align:center;border-top:1px solid #eee;color:#999;font-size:12px;">
          <p>Elara — Elegant Fashion for Every Occasion</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [customerEmail],
        subject: `Order Confirmed — ${orderNumber}`,
        html,
      }),
    });

    const emailData = await emailRes.json();

    return new Response(JSON.stringify({ success: true, emailId: emailData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-order-confirmation error:", error);
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
