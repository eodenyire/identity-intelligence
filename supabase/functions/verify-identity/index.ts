// Edge function: analyzes ID document + selfie via Lovable AI (Gemini vision),
// computes a trust score, updates the verification_session, and queues a webhook.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  token: string; // public_token of the session
  documents: Array<{
    doc_type: "id_front" | "id_back" | "selfie" | "liveness";
    mime_type: string;
    inline_b64: string; // base64-encoded image bytes
  }>;
  device_fingerprint?: string;
  device_label?: string;
  liveness_challenge?: { challenge: string; passed: boolean };
  behavior?: {
    keystroke_intervals_ms?: number[];
    pointer_events?: number;
    session_duration_ms?: number;
    timezone?: string;
    webdriver?: boolean;
    touch?: boolean;
    paste_events?: number;
  };
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Behavioral: keystroke rhythm + interaction realism. 100 = human-like. */
function behaviorLayer(b: VerifyRequest["behavior"]) {
  const signals: string[] = [];
  let score = 80;
  const ks = (b?.keystroke_intervals_ms ?? []).filter((x) => x > 0 && x < 5000);
  let mean = 0, cv = 0;
  if (ks.length >= 5) {
    mean = ks.reduce((a, c) => a + c, 0) / ks.length;
    const sd = Math.sqrt(ks.reduce((a, c) => a + (c - mean) ** 2, 0) / ks.length);
    cv = sd / (mean || 1);
    if (cv < 0.12) { score -= 35; signals.push("Keystroke timing too uniform (scripted input)"); }
    if (mean < 35) { score -= 25; signals.push("Superhuman typing speed"); }
  } else signals.push("Few keystrokes captured");
  if ((b?.paste_events ?? 0) > 0) { score -= 10; signals.push("Details were pasted"); }
  if ((b?.pointer_events ?? 0) < 3) { score -= 15; signals.push("Almost no pointer/touch interaction"); }
  if ((b?.session_duration_ms ?? 0) < 15000) { score -= 20; signals.push("Flow completed implausibly fast"); }
  return { score: clamp(score), signals, keystrokes: ks.length, mean_interval_ms: Math.round(mean), rhythm_cv: Number(cv.toFixed(2)) };
}

/** Network: IP geolocation vs declared country and browser timezone. */
async function networkLayer(ip: string | null, declaredCountry: string | null, tz?: string) {
  const signals: string[] = [];
  let score = 85;
  let geo: any = null;
  if (ip) {
    try {
      const r = await fetch(`https://ipwho.is/${ip}`);
      if (r.ok) geo = await r.json();
    } catch { /* ignore */ }
  }
  if (geo?.success) {
    const cc = geo.country_code as string;
    if (declaredCountry && cc && !declaredCountry.toUpperCase().includes(cc) && !(geo.country ?? "").toLowerCase().includes(declaredCountry.toLowerCase())) {
      score -= 30; signals.push(`IP located in ${geo.country} but declared ${declaredCountry}`);
    }
    if (tz && geo.timezone?.id && geo.timezone.id !== tz) {
      score -= 15; signals.push(`Browser timezone ${tz} ≠ IP timezone ${geo.timezone.id}`);
    }
    if (geo.security?.vpn || geo.security?.proxy || geo.security?.tor) { score -= 30; signals.push("VPN/proxy/Tor detected"); }
    if (/hosting|data ?center|cloud|amazon|google|microsoft|digitalocean|ovh/i.test(geo.connection?.org ?? geo.connection?.isp ?? "")) {
      score -= 20; signals.push(`Datacenter IP (${geo.connection?.isp ?? "hosting"})`);
    }
  } else signals.push("IP geolocation unavailable");
  return { score: clamp(score), signals, ip_country: geo?.country ?? null, ip_city: geo?.city ?? null, isp: geo?.connection?.isp ?? null };
}

/** Device: automation flags + fingerprint reuse across other identities. */
async function deviceLayer(fp: string | undefined, b: VerifyRequest["behavior"], label: string | undefined, sessionId: string, operatorId: string) {
  const signals: string[] = [];
  let score = 90;
  if (b?.webdriver) { score -= 50; signals.push("Browser automation (webdriver) detected"); }
  if (/headless|phantom|selenium|puppeteer/i.test(label ?? "")) { score -= 40; signals.push("Headless browser user agent"); }
  let reuse = 0;
  if (fp) {
    const { data } = await admin.from("verification_sessions").select("id,customer_name")
      .eq("device_fingerprint", fp).eq("user_id", operatorId).neq("id", sessionId);
    reuse = data?.length ?? 0;
    if (reuse > 0) { score -= Math.min(50, reuse * 20); signals.push(`Device used by ${reuse} other identit${reuse === 1 ? "y" : "ies"}`); }
  } else { score -= 20; signals.push("No device fingerprint"); }
  return { score: clamp(score), signals, reuse_count: reuse };
}

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function analyzeWithAI(images: { type: string; dataUrl: string }[]) {
  const userContent: any[] = [
    {
      type: "text",
      text: `You are an expert KYC verification analyst. Analyze the provided identity documents and selfie.

Return a JSON object via the analyze_identity tool call with:
- ocr: extracted fields (full_name, document_number, date_of_birth, expiry_date, nationality, gender)
- document_authenticity_score: 0-100 (signs of tampering, watermarks, fonts)
- face_match_score: 0-100 (does the selfie match the ID photo)
- liveness_score: 0-100 (does the selfie look like a real person, not a printout/screen)
- deepfake_score: 0-100 (likelihood the selfie/liveness frames are AI-generated or manipulated; 0 = clearly real)
- deepfake_signals: array of strings describing specific deepfake artifacts (e.g. "inconsistent lighting", "warped ear geometry", "GAN texture patterns"), empty if none
- liveness_challenge_passed: boolean (if a LIVENESS image is present, does it show the requested head movement/expression vs the plain selfie)
- risk_signals: array of strings describing any red flags
- recommendation: one of "approve", "review", "reject"
- reasoning: brief explanation`,
    },
  ];
  for (const img of images) {
    userContent.push({ type: "text", text: `--- ${img.type.toUpperCase()} ---` });
    userContent.push({ type: "image_url", image_url: { url: img.dataUrl } });
  }

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [{ role: "user", content: userContent }],
      tools: [
        {
          type: "function",
          function: {
            name: "analyze_identity",
            description: "Return KYC analysis result",
            parameters: {
              type: "object",
              properties: {
                ocr: {
                  type: "object",
                  properties: {
                    full_name: { type: "string" },
                    document_number: { type: "string" },
                    date_of_birth: { type: "string" },
                    expiry_date: { type: "string" },
                    nationality: { type: "string" },
                    gender: { type: "string" },
                  },
                },
                document_authenticity_score: { type: "number" },
                face_match_score: { type: "number" },
                liveness_score: { type: "number" },
                deepfake_score: { type: "number" },
                deepfake_signals: { type: "array", items: { type: "string" } },
                liveness_challenge_passed: { type: "boolean" },
                risk_signals: { type: "array", items: { type: "string" } },
                recommendation: { type: "string", enum: ["approve", "review", "reject"] },
                reasoning: { type: "string" },
              },
              required: ["document_authenticity_score", "face_match_score", "liveness_score", "deepfake_score", "recommendation", "reasoning"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "analyze_identity" } },
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI gateway error ${resp.status}: ${t}`);
  }
  const data = await resp.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("No tool call in AI response");
  return JSON.parse(call.function.arguments);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as VerifyRequest;
    if (!body.token || !Array.isArray(body.documents) || body.documents.length === 0) {
      return new Response(JSON.stringify({ error: "token and documents required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up session by token
    const { data: session, error: sErr } = await admin
      .from("verification_sessions")
      .select("*")
      .eq("public_token", body.token)
      .maybeSingle();
    if (sErr || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(session.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Session expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("verification_sessions").update({ status: "in_progress" }).eq("id", session.id);

    // Upload each document to storage under the operator's user_id folder
    // (so existing RLS policies let the operator view it later) and persist row.
    const images: { type: string; dataUrl: string }[] = [];
    for (const d of body.documents) {
      const ext = d.mime_type.includes("png") ? "png" : "jpg";
      const path = `${session.user_id}/${session.id}/${d.doc_type}-${Date.now()}.${ext}`;
      const bytes = b64ToBytes(d.inline_b64);
      const { error: upErr } = await admin.storage
        .from("verifications")
        .upload(path, bytes, { contentType: d.mime_type, upsert: true });
      if (upErr) console.error("storage upload failed", upErr);

      await admin.from("verification_documents").insert({
        session_id: session.id,
        doc_type: d.doc_type,
        storage_path: path,
        mime_type: d.mime_type,
      });

      images.push({ type: d.doc_type, dataUrl: `data:${d.mime_type};base64,${d.inline_b64}` });
    }

    // Run AI
    let analysis: any;
    try {
      analysis = await analyzeWithAI(images);
    } catch (e) {
      console.error("AI analysis failed", e);
      const msg = e instanceof Error ? e.message : "AI failure";
      if (msg.includes("429")) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded — please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (msg.includes("402")) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw e;
    }

    // ---- Per-layer scoring (each 0-100) ----
    const auth = analysis.document_authenticity_score ?? 0;
    const face = analysis.face_match_score ?? 0;
    const live = analysis.liveness_score ?? 0;
    const deepfake = analysis.deepfake_score ?? 0;
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("cf-connecting-ip");
    const [network, device] = await Promise.all([
      networkLayer(ip, session.country, body.behavior?.timezone),
      deviceLayer(body.device_fingerprint, body.behavior, body.device_label, session.id, session.user_id),
    ]);
    const behavior = behaviorLayer(body.behavior);
    const biometric = clamp(face * 0.6 + live * 0.4 - deepfake * 0.5);
    const layers = {
      document: { score: clamp(auth), weight: 0.25 },
      biometric: { score: biometric, weight: 0.35, deepfake_score: deepfake, liveness_challenge_passed: analysis.liveness_challenge_passed ?? null },
      behavior: { ...behavior, weight: 0.15 },
      network: { ...network, weight: 0.1 },
      device: { ...device, weight: 0.15 },
    };
    let trust = Math.round(
      Object.values(layers).reduce((a, l: any) => a + l.score * l.weight, 0) * 10,
    ); // 0-1000
    if (analysis.liveness_challenge_passed === false) trust = Math.min(trust, 400);
    if (device.reuse_count >= 2 || body.behavior?.webdriver) trust = Math.min(trust, 500);

    let status: "verified" | "flagged" | "rejected";
    if (analysis.recommendation === "approve" && trust >= 700 && deepfake < 50) status = "verified";
    else if (analysis.recommendation === "reject" || trust < 350 || deepfake >= 80) status = "rejected";
    else status = "flagged";

    const extraSignals = [...behavior.signals, ...network.signals, ...device.signals].filter(
      (s) => !/unavailable|Few keystrokes/.test(s),
    );
    analysis.risk_signals = [...(analysis.risk_signals ?? []), ...extraSignals];

    await admin
      .from("verification_sessions")
      .update({
        status,
        trust_score: trust,
        ai_analysis: analysis,
        risk_layers: layers,
        client_ip: ip ?? null,
        device_fingerprint: body.device_fingerprint ?? null,
        liveness_challenge: body.liveness_challenge ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    // Fire-and-forget AML/PEP screening (always runs after analysis)
    EdgeRuntime.waitUntil(
      admin.functions
        .invoke("aml-screen", { body: { session_id: session.id } })
        .catch((e) => console.error("aml-screen failed", e)),
    );

    // Auto-issue identity credential when verified
    if (status === "verified") {
      EdgeRuntime.waitUntil(
        admin.functions
          .invoke("issue-credential", { body: { session_id: session.id } })
          .catch((e) => console.error("issue-credential failed", e)),
      );
    }

    // Fire-and-forget webhook dispatch
    const eventType = `verification.${status}`;
    EdgeRuntime.waitUntil(
      admin.functions
        .invoke("dispatch-webhook", {
          body: { user_id: session.user_id, session_id: session.id, event_type: eventType },
        })
        .catch((e) => console.error("webhook dispatch failed", e)),
    );

    return new Response(
      JSON.stringify({ status, trust_score: trust, analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("verify-identity error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
