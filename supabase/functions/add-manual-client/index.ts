import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller is a mentor
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user: caller } } = await anonClient.auth.getUser(token);
    if (!caller) throw new Error("Unauthorized");

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();
    if (callerProfile?.role !== "mentor") throw new Error("Only mentors can add clients");

    const { name, phone, amount_paid, sessions_total, notes, division_id } = await req.json();
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      throw new Error("Name is required");
    }

    const trimmedName = name.trim().slice(0, 100);
    const sanitized = trimmedName.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "");
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const email = `manual.${sanitized || "client"}.${uniqueId}@mentorchat.app`;
    const password = `M_${uniqueId}_${crypto.randomUUID().slice(0, 8)}`;

    // Create auth user with service role (won't affect caller's session)
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) throw createError;
    if (!newUser.user) throw new Error("Failed to create user");

    const userId = newUser.user.id;

    // Create profile
    const { error: profileErr } = await supabase.from("profiles").insert({
      id: userId,
      display_name: trimmedName,
      role: "manual_client",
      approved: true,
      division_id: division_id || null,
    });
    if (profileErr) {
      console.error("Profile insert error:", profileErr);
      throw new Error(`Profile creation failed: ${profileErr.message}`);
    }

    // Save client details
    const { error: detailsErr } = await supabase.from("client_details").insert({
      student_id: userId,
      phone: phone?.trim()?.slice(0, 20) || null,
      amount_paid: typeof amount_paid === "number" ? Math.max(0, amount_paid) : 0,
      sessions_total: typeof sessions_total === "number" ? Math.min(10, Math.max(0, sessions_total)) : 0,
      notes: notes?.trim()?.slice(0, 1000) || null,
    });
    if (detailsErr) console.error("Details insert error:", detailsErr);

    // Set initial stage
    const { error: stageErr } = await supabase.from("student_stages").insert({
      student_id: userId,
      stage: 0,
    });
    if (stageErr) console.error("Stage insert error:", stageErr);

    return new Response(JSON.stringify({ id: userId, name: trimmedName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
