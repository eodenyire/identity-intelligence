// Edge function: posts verification events to all matching active webhooks for a user,
// with HMAC-SHA256 signature, and logs deliveries.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE);

async function hmac(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user_id, session_id, event_type } = await req.json();
    if (!user_id || !session_id || !event_type) {
      return new Response(JSON.stringify({ error: "user_id, session_id, event_type required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: hooks } = await admin
      .from("webhook_endpoints")
      .select("*")
      .eq("user_id", user_id)
      .eq("is_active", true);

    if (!hooks || hooks.length === 0) {
      return new Response(JSON.stringify({ delivered: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: session } = await admin
      .from("verification_sessions")
      .select("id, customer_name, customer_email, customer_phone, country, id_type, status, trust_score, ai_analysis, completed_at")
      .eq("id", session_id)
      .maybeSingle();

    const payload = {
      event: event_type,
      created_at: new Date().toISOString(),
      data: { session },
    };
    const body = JSON.stringify(payload);

    let count = 0;
    for (const hook of hooks) {
      if (!hook.enabled_events.includes(event_type)) continue;
      const sig = await hmac(hook.signing_secret, body);
      try {
        const r = await fetch(hook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-TrustLayer-Signature": `sha256=${sig}`,
            "X-TrustLayer-Event": event_type,
          },
          body,
        });
        const text = await r.text().catch(() => "");
        await admin.from("webhook_deliveries").insert({
          webhook_id: hook.id,
          session_id,
          event_type,
          payload,
          response_status: r.status,
          response_body: text.slice(0, 1000),
          delivered_at: new Date().toISOString(),
        });
        count++;
      } catch (e) {
        await admin.from("webhook_deliveries").insert({
          webhook_id: hook.id,
          session_id,
          event_type,
          payload,
          response_status: 0,
          response_body: e instanceof Error ? e.message : "fetch failed",
        });
      }
    }

    return new Response(JSON.stringify({ delivered: count }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dispatch-webhook error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
