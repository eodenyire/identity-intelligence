// Public endpoint for third parties to verify a TrustLayer credential JWT.
// POST { jwt } -> { valid, claims?, reason? }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verify as jwtVerify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getSigningKey() {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { jwt } = await req.json();
    if (!jwt) {
      return new Response(JSON.stringify({ valid: false, reason: "jwt required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = await getSigningKey();
    let claims: any;
    try {
      claims = await jwtVerify(jwt, key);
    } catch (e) {
      return new Response(JSON.stringify({ valid: false, reason: "signature invalid or expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: row } = await admin
      .from("identity_credentials")
      .select("credential_id, revoked_at, expires_at, subject_name, subject_country, trust_score, issued_at")
      .eq("credential_id", claims.jti)
      .maybeSingle();

    if (!row) {
      return new Response(JSON.stringify({ valid: false, reason: "credential not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (row.revoked_at) {
      return new Response(JSON.stringify({ valid: false, reason: "revoked", revoked_at: row.revoked_at }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      valid: true,
      credential_id: row.credential_id,
      issued_at: row.issued_at,
      expires_at: row.expires_at,
      claims,
      record: row,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ valid: false, reason: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
