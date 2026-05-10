// GDPR Article 17 — Right to Erasure for a single verification session.
// Removes documents from storage, then cascades the session row (which removes
// docs, screenings, credentials via FK ON DELETE CASCADE).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "auth required" }), { status: 401, headers: corsHeaders });
    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id required" }), { status: 400, headers: corsHeaders });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "invalid token" }), { status: 401, headers: corsHeaders });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: session } = await admin
      .from("verification_sessions")
      .select("id, user_id, customer_name")
      .eq("id", session_id)
      .maybeSingle();
    if (!session || session.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: corsHeaders });
    }

    // Remove storage objects
    const { data: docs } = await admin
      .from("verification_documents")
      .select("storage_path")
      .eq("session_id", session_id);
    const paths = (docs ?? []).map((d) => d.storage_path);
    if (paths.length) {
      await admin.storage.from("verifications").remove(paths);
    }

    // Revoke any credential first (audit trail)
    await admin.from("identity_credentials")
      .update({ revoked_at: new Date().toISOString() })
      .eq("session_id", session_id);

    // Cascade delete
    await admin.from("verification_sessions").delete().eq("id", session_id);

    await admin.from("audit_log").insert({
      user_id: user.id,
      actor: user.email ?? user.id,
      action: "gdpr.delete",
      details: { session_id, customer_name: session.customer_name, files_removed: paths.length },
    });

    return new Response(JSON.stringify({ ok: true, files_removed: paths.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
