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

    // Verify caller is main_admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) throw new Error("Unauthorized");

    const { data: isMain } = await supabaseAdmin.rpc("is_main_admin", { _user_id: user.id });
    if (!isMain) throw new Error("Only main admin can manage admins");

    const body = await req.json();

    if (body.action === "update_password") {
      await supabaseAdmin.auth.admin.updateUserById(body.auth_user_id, { password: body.password });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { name, email, password } = body;
    if (!name || !email || !password) throw new Error("Name, email, and password are required");

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (authError) throw authError;

    const { data: admin, error: adminError } = await supabaseAdmin
      .from("admins")
      .insert({ auth_user_id: authUser.user.id, name, email, created_by: null })
      .select("id")
      .single();
    if (adminError) throw adminError;

    await supabaseAdmin.from("admin_roles").insert({ user_id: authUser.user.id, role: "sub_admin" });

    return new Response(JSON.stringify({ success: true, adminId: admin.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
