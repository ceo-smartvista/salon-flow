import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return jsonResponse({ error: "Function is misconfigured: missing backend secrets" }, 500);
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const callerId = claimsData.claims.sub as string;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerIsSuperAdmin, error: roleError } = await adminClient.rpc("has_role", {
      _user_id: callerId,
      _role: "super_admin",
    });

    if (roleError) {
      throw roleError;
    }

    if (!callerIsSuperAdmin) {
      return jsonResponse({ error: "Forbidden: super_admin role required" }, 403);
    }

    let payload: { user_id?: string };
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid request body" }, 400);
    }

    const userId = payload.user_id?.trim();
    if (!userId) {
      return jsonResponse({ error: "user_id is required" }, 400);
    }

    if (userId === callerId) {
      return jsonResponse({ error: "Cannot delete yourself" }, 400);
    }

    const { data: targetIsSuperAdmin, error: targetRoleError } = await adminClient.rpc("has_role", {
      _user_id: userId,
      _role: "super_admin",
    });

    if (targetRoleError) {
      throw targetRoleError;
    }

    if (targetIsSuperAdmin) {
      return jsonResponse({ error: "Cannot delete a super admin" }, 403);
    }

    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      const message = authDeleteError.message?.toLowerCase() ?? "";
      if (!message.includes("user not found")) {
        throw authDeleteError;
      }
    }

    const [{ error: roleDeleteError }, { error: profileDeleteError }] = await Promise.all([
      adminClient.from("user_roles").delete().eq("user_id", userId),
      adminClient.from("profiles").delete().eq("user_id", userId),
    ]);

    if (roleDeleteError) throw roleDeleteError;
    if (profileDeleteError) throw profileDeleteError;

    return jsonResponse({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("delete-user failed:", message);
    return jsonResponse({ error: message }, 400);
  }
});
