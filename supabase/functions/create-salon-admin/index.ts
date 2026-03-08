import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is super_admin
    const anonClient = createClient(supabaseUrl, anonKey);
    const {
      data: { user: caller },
    } = await anonClient.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: isSA } = await adminClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "super_admin",
    });
    if (!isSA) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { salon_name, owner_email, temp_password, full_name, license_days, grace_days, notes } =
      await req.json();

    if (!salon_name || !owner_email || !temp_password) {
      return new Response(
        JSON.stringify({ error: "salon_name, owner_email, and temp_password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Create auth user with temp password
    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email: owner_email,
        password: temp_password,
        email_confirm: true, // auto-confirm since super admin is creating
        user_metadata: {
          full_name: full_name || salon_name,
          must_change_password: true,
        },
      });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = newUser.user.id;

    // 2. Assign 'admin' role (the handle_new_user trigger already creates profile + 'user' role)
    await adminClient.from("user_roles").insert({ user_id: userId, role: "admin" });

    // 3. Create tenant record
    const licenseEnd = new Date();
    licenseEnd.setDate(licenseEnd.getDate() + (license_days || 30));

    const { error: tenantError } = await adminClient.from("tenants").insert({
      name: salon_name,
      owner_email: owner_email,
      owner_user_id: userId,
      license_end: licenseEnd.toISOString(),
      grace_days: grace_days || 7,
      notes: notes || null,
    });

    if (tenantError) {
      return new Response(JSON.stringify({ error: tenantError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
