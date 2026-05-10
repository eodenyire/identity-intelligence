// GDPR Article 15 — Right of Access. Returns all data the operator holds about themselves
// and their verification subjects (sessions, documents (paths), screenings, credentials, audit).
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

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "invalid token" }), { status: 401, headers: corsHeaders });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const [profile, sessions, docs, screenings, credentials, audit, webhooks, keys] = await Promise.all([
      admin.from("profiles").select("*").eq("user_id", user.id),
      admin.from("verification_sessions").select("*").eq("user_id", user.id),
      admin.from("verification_documents").select("id,session_id,doc_type,storage_path,mime_type,created_at"),
      admin.from("compliance_screenings").select("*").eq("user_id", user.id),
      admin.from("identity_credentials").select("*").eq("user_id", user.id),
      admin.from("audit_log").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1000),
      admin.from("webhook_endpoints").select("id,label,url,enabled_events,is_active,created_at").eq("user_id", user.id),
      admin.from("api_keys").select("id,name,key_prefix,is_active,created_at,last_used_at").eq("user_id", user.id),
    ]);

    const sessionIds = new Set((sessions.data ?? []).map((s) => s.id));
    const filteredDocs = (docs.data ?? []).filter((d) => sessionIds.has(d.session_id));

    const exportPayload = {
      generated_at: new Date().toISOString(),
      subject: { id: user.id, email: user.email },
      profile: profile.data,
      verification_sessions: sessions.data,
      verification_documents: filteredDocs,
      compliance_screenings: screenings.data,
      identity_credentials: credentials.data,
      webhook_endpoints: webhooks.data,
      api_keys: keys.data,
      audit_log: audit.data,
    };

    await admin.from("audit_log").insert({
      user_id: user.id,
      actor: user.email ?? user.id,
      action: "gdpr.export",
      details: { sessions: sessions.data?.length ?? 0 },
    });

    return new Response(JSON.stringify(exportPayload, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="trustlayer-export-${user.id}.json"`,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
