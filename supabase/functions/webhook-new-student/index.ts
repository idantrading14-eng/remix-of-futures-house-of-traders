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

    const body = await req.json();
    const { email, firstName, lastName, phone, orderId, orderTotal, orderDate, products, productsId, divisionId } = body;

    // Validate required fields
    if (!email || typeof email !== "string" || !email.includes("@")) {
      throw new Error("Valid email is required");
    }
    const trimmedEmail = email.trim().toLowerCase();
    const displayName = `${(firstName || "").trim()} ${(lastName || "").trim()}`.trim() || "תלמיד";
    const cleanPhone = (phone && typeof phone === "string")
      ? phone.trim().replace(/[^0-9+\-]/g, "").slice(0, 20)
      : "";

    // Use phone as password if available, otherwise use email as password
    const hasValidPhone = cleanPhone.length >= 5;
    const password = hasValidPhone ? cleanPhone : trimmedEmail;
    console.log(`Password source for ${trimmedEmail}: ${hasValidPhone ? "phone" : "email"}`);

    // Check if user already exists by email
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: any) => u.email === trimmedEmail
    );

    let userId: string;

    if (existingUser) {
      // User already exists - just update details
      userId = existingUser.id;
      console.log(`User already exists: ${userId}, updating details`);
    } else {
      // Create new auth user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: trimmedEmail,
        password,
        email_confirm: true,
      });
      if (createError) throw createError;
      if (!newUser.user) throw new Error("Failed to create user");

      userId = newUser.user.id;

      // Create profile
      const { error: profileErr } = await supabase.from("profiles").insert({
        id: userId,
        display_name: displayName,
        role: "student",
        approved: true,
        division_id: divisionId || null,
      });
      if (profileErr) {
        console.error("Profile insert error:", profileErr);
        throw new Error(`Profile creation failed: ${profileErr.message}`);
      }

      // Create student_access (upsert to handle duplicates)
      const { error: accessErr } = await supabase.from("student_access").upsert(
        { user_id: userId, has_courses_access: true, has_mentorchat_access: false },
        { onConflict: "user_id" }
      );
      if (accessErr) console.error("Access upsert error:", accessErr);

      // Create initial stage (upsert to handle duplicates)
      const { error: stageErr } = await supabase.from("student_stages").upsert(
        { student_id: userId, stage: 0 },
        { onConflict: "student_id" }
      );
      if (stageErr) console.error("Stage upsert error:", stageErr);
    }

    // Upsert client_details with order info
    const notesText = [
      `הזמנה #${orderId || "N/A"}`,
      `תאריך: ${orderDate || new Date().toISOString()}`,
      products?.length ? `מוצרים: ${Array.isArray(products) ? products.join(", ") : products}` : null,
    ].filter(Boolean).join("\n");

    const { error: detailsErr } = await supabase.from("client_details").upsert(
      {
        student_id: userId,
        phone: cleanPhone,
        email: trimmedEmail,
        amount_paid: typeof orderTotal === "number" ? Math.max(0, orderTotal) : 0,
        notes: notesText,
        status: "active",
      } as any,
      { onConflict: "student_id" }
    );
    if (detailsErr) console.error("Details upsert error:", detailsErr);

    // Store product IDs on client_details regardless of whether courses exist yet
    const productIds = Array.isArray(productsId) ? productsId.map((id: any) => String(id)) : [];
    if (productIds.length > 0) {
      const { error: prodErr } = await supabase.from("client_details")
        .update({ product_ids: productIds })
        .eq("student_id", userId);
      if (prodErr) console.error("Product IDs update error:", prodErr);
      else console.log(`Stored product IDs [${productIds.join(", ")}] for user ${userId}`);
    }

    // Log activity
    await supabase.from("activity_log").insert({
      client_id: userId,
      action: "webhook_created",
      description: `תלמיד חדש נוצר מ-webhook: ${displayName} (הזמנה #${orderId || "N/A"})`,
    });

    return new Response(
      JSON.stringify({ success: true, id: userId, name: displayName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
