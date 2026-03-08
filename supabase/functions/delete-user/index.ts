import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is super_admin
    const callerClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: { user: caller } } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    }).auth.getUser();

    if (!caller) throw new Error("Unauthorized");

    const { data: hasRole } = await callerClient.rpc("has_role", { _user_id: caller.id, _role: "super_admin" });
    if (!hasRole) throw new Error("Forbidden: super_admin role required");

    const { user_id } = await req.json();
    if (!user_id) throw new Error("user_id is required");
    if (user_id === caller.id) throw new Error("Cannot delete yourself");

    // Delete profile and roles first (cascade should handle some)
    await callerClient.from("user_roles").delete().eq("user_id", user_id);
    await callerClient.from("profiles").delete().eq("user_id", user_id);

    // Delete auth user
    const { error } = await callerClient.auth.admin.deleteUser(user_id);
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
