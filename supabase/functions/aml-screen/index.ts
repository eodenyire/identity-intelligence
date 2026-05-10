// AML/PEP screening via OpenSanctions free Match API.
// Looks up customer name (and optional country) against sanctions, PEP, and watchlists.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface ReqBody {
  session_id: string;
}

async function screen(name: string, country?: string | null) {
  const body = {
    queries: {
      q1: {
        schema: "Person",
        properties: {
          name: [name],
          ...(country ? { nationality: [country] } : {}),
        },
      },
    },
  };
  const url = "https://api.opensanctions.org/match/default?algorithm=name-based&limit=5";
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`OpenSanctions ${r.status}: ${await r.text()}`);
  return await r.json();
}

function classify(results: any[]) {
  let sanctions = 0, pep = 0, adverse = 0, top = 0;
  const hits = (results ?? []).map((h) => {
    const topics: string[] = h.properties?.topics ?? [];
    const score = h.score ?? 0;
    if (score > top) top = score;
    if (topics.some((t) => t.startsWith("sanction"))) sanctions++;
    if (topics.some((t) => t.startsWith("role.pep"))) pep++;
    if (topics.some((t) => t.includes("crime") || t.includes("debarment"))) adverse++;
    return {
      id: h.id,
      caption: h.caption,
      score,
      match: h.match,
      topics,
      datasets: h.datasets,
    };
  });
  let risk = "low";
  if (sanctions > 0 || top >= 0.85) risk = "high";
  else if (pep > 0 || adverse > 0 || top >= 0.7) risk = "medium";
  return { sanctions, pep, adverse, top, hits, risk };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { session_id } = (await req.json()) as ReqBody;
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

    // Prefer OCR-extracted name if available
    const ocrName = session.ai_analysis?.ocr?.full_name;
    const name = (ocrName && ocrName.length > 2) ? ocrName : session.customer_name;

    const raw = await screen(name, session.country);
    const results = raw.responses?.q1?.results ?? [];
    const c = classify(results);

    const { data: inserted } = await admin
      .from("compliance_screenings")
      .insert({
        session_id,
        user_id: session.user_id,
        provider: "opensanctions",
        query_name: name,
        query_country: session.country,
        total_hits: results.length,
        sanctions_hits: c.sanctions,
        pep_hits: c.pep,
        adverse_media_hits: c.adverse,
        risk_level: c.risk,
        top_match_score: c.top,
        hits: c.hits,
        raw_response: raw,
      })
      .select()
      .single();

    await admin.from("audit_log").insert({
      user_id: session.user_id,
      session_id,
      actor: "system",
      action: "aml.screened",
      details: { risk: c.risk, total: results.length, sanctions: c.sanctions, pep: c.pep },
    });

    return new Response(JSON.stringify({ screening: inserted, risk: c.risk }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("aml-screen", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
