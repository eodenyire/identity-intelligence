// Issues a signed reusable identity credential (HS256 JWT) for a verified session.
// The credential is non-PII: name initials, country, trust score, issuance time.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { create as jwtCreate, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getSigningKey() {
  // Derive a stable HMAC key from the service role secret. Same key across invocations.
  const secret = SUPABASE_SERVICE_ROLE_KEY + ":trustlayer-credential-v1";
  const enc = new TextEncoder().encode(secret);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  return await crypto.subtle.importKey(
    "raw",
    hash,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function initials(name: string) {
  return name.split(/\s+/).map((p) => p[0]?.toUpperCase() ?? "").join("").slice(0, 4);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id required" }), { status: 400, headers: corsHeaders });
    }

    const { data: session } = await admin
      .from("verification_sessions")
      .select("*")
      .eq("id", session_id)
      .maybeSingle();
    if (!session) {
      return new Response(JSON.stringify({ error: "session not found" }), { status: 404, headers: corsHeaders });
    }
    if (session.status !== "verified") {
      return new Response(JSON.stringify({ error: "session not verified" }), { status: 400, headers: corsHeaders });
    }

    const { data: existing } = await admin
      .from("identity_credentials")
      .select("*")
      .eq("session_id", session_id)
      .is("revoked_at", null)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ credential: existing, reused: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const credentialId = "tlc_" + crypto.randomUUID().replace(/-/g, "");
    const issuedAt = new Date();
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const claims = {
      iss: "trustlayer",
      sub: credentialId,
      iat: getNumericDate(issuedAt),
      exp: getNumericDate(expiresAt),
      jti: credentialId,
      cred_type: "VerifiedIdentity",
      subject: {
        initials: initials(session.customer_name),
        country: session.country,
        id_type: session.id_type,
      },
      assurance: {
        trust_score: session.trust_score,
        document_verified: true,
        face_match: true,
        liveness: true,
      },
      verified_at: session.completed_at ?? issuedAt.toISOString(),
    };

    const key = await getSigningKey();
    const jwt = await jwtCreate({ alg: "HS256", typ: "JWT" }, claims, key);

    const { data: inserted } = await admin
      .from("identity_credentials")
      .insert({
        credential_id: credentialId,
        session_id,
        user_id: session.user_id,
        subject_name: session.customer_name,
        subject_country: session.country,
        trust_score: session.trust_score,
        jwt,
        claims,
        issued_at: issuedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    await admin.from("audit_log").insert({
      user_id: session.user_id,
      session_id,
      actor: "system",
      action: "credential.issued",
      details: { credential_id: credentialId },
    });

    return new Response(JSON.stringify({ credential: inserted, reused: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("issue-credential", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
