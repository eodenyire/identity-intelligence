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

// Normalized hit shape shared by all providers
interface Hit { id: string; caption: string; score: number; topics: string[]; datasets?: string[]; match?: boolean }

// Provider slots — first one with a configured key wins; free OpenSanctions is the fallback.
// DILISENSE_API_KEY        → dilisense.com (affordable, PEP + sanctions)
// COMPLYADVANTAGE_API_KEY  → ComplyAdvantage
// OPENSANCTIONS_API_KEY    → OpenSanctions commercial (same data, licensed + higher limits)
async function screenDilisense(key: string, name: string, country?: string | null) {
  const u = new URL("https://api.dilisense.com/v1/checkIndividual");
  u.searchParams.set("names", name);
  if (country) u.searchParams.set("country", country);
  const r = await fetch(u, { headers: { "x-api-key": key } });
  if (!r.ok) throw new Error(`Dilisense ${r.status}: ${await r.text()}`);
  const raw = await r.json();
  const hits: Hit[] = (raw.found_records ?? []).map((h: any) => ({
    id: h.id, caption: h.name, score: 0.9,
    topics: [h.source_type === "SANCTION" ? "sanction" : h.source_type === "PEP" ? "role.pep" : "crime"],
    datasets: [h.source_id].filter(Boolean),
  }));
  return { provider: "dilisense", raw, hits };
}

async function screenComplyAdvantage(key: string, name: string, country?: string | null) {
  const r = await fetch("https://api.complyadvantage.com/searches", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Token ${key}` },
    body: JSON.stringify({
      search_term: name, fuzziness: 0.6, limit: 10,
      filters: { types: ["sanction", "warning", "pep", "adverse-media"], ...(country ? { country_codes: [country] } : {}) },
    }),
  });
  if (!r.ok) throw new Error(`ComplyAdvantage ${r.status}: ${await r.text()}`);
  const raw = await r.json();
  const hits: Hit[] = (raw.content?.data?.hits ?? []).map((h: any) => {
    const types: string[] = h.doc?.types ?? [];
    return {
      id: h.doc?.id, caption: h.doc?.name, score: h.score ? Math.min(1, h.score / 2) : 0.8,
      topics: types.map((t) => (t.startsWith("sanction") ? "sanction" : t.startsWith("pep") ? "role.pep" : "crime")),
    };
  });
  return { provider: "complyadvantage", raw, hits };
}

async function screenOpenSanctions(name: string, country?: string | null, key?: string) {
  const body = { queries: { q1: { schema: "Person", properties: { name: [name], ...(country ? { nationality: [country] } : {}) } } } };
  const r = await fetch("https://api.opensanctions.org/match/default?algorithm=name-based&limit=5", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(key ? { Authorization: `ApiKey ${key}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`OpenSanctions ${r.status}: ${await r.text()}`);
  const raw = await r.json();
  const hits: Hit[] = (raw.responses?.q1?.results ?? []).map((h: any) => ({
    id: h.id, caption: h.caption, score: h.score ?? 0, match: h.match, topics: h.properties?.topics ?? [], datasets: h.datasets,
  }));
  return { provider: key ? "opensanctions_pro" : "opensanctions_free", raw, hits };
}

async function screen(name: string, country?: string | null) {
  const dil = Deno.env.get("DILISENSE_API_KEY");
  const ca = Deno.env.get("COMPLYADVANTAGE_API_KEY");
  const os = Deno.env.get("OPENSANCTIONS_API_KEY");
  try {
    if (dil) return await screenDilisense(dil, name, country);
    if (ca) return await screenComplyAdvantage(ca, name, country);
  } catch (e) {
    console.error("primary AML provider failed, falling back", e);
  }
  return await screenOpenSanctions(name, country, os);
}

function classify(results: Hit[]) {
  let sanctions = 0, pep = 0, adverse = 0, top = 0;
  for (const h of results) {
    if (h.score > top) top = h.score;
    if (h.topics.some((t) => t.startsWith("sanction"))) sanctions++;
    if (h.topics.some((t) => t.startsWith("role.pep"))) pep++;
    if (h.topics.some((t) => t.includes("crime") || t.includes("debarment"))) adverse++;
  }
  let risk = "low";
  if (sanctions > 0 || top >= 0.85) risk = "high";
  else if (pep > 0 || adverse > 0 || top >= 0.7) risk = "medium";
  return { sanctions, pep, adverse, top, hits: results, risk };
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

    const { provider, raw, hits: results } = await screen(name, session.country);
    const c = classify(results);

    const { data: inserted } = await admin
      .from("compliance_screenings")
      .insert({
        session_id,
        user_id: session.user_id,
        provider,
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
