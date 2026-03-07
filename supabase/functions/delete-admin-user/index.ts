import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) throw new Error("Unauthorized");

    const { data: isMain } = await supabaseAdmin.rpc("is_main_admin", { _user_id: user.id });
    if (!isMain) throw new Error("Only main admin can delete admins");

    const { admin_id, auth_user_id } = await req.json();
    if (!admin_id || !auth_user_id) throw new Error("admin_id and auth_user_id required");

    await supabaseAdmin.from("admin_roles").delete().eq("user_id", auth_user_id);
    await supabaseAdmin.from("admins").delete().eq("id", admin_id);
    await supabaseAdmin.auth.admin.deleteUser(auth_user_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
