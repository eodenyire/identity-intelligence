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
                risk_signals: { type: "array", items: { type: "string" } },
                recommendation: { type: "string", enum: ["approve", "review", "reject"] },
                reasoning: { type: "string" },
              },
              required: ["document_authenticity_score", "face_match_score", "liveness_score", "recommendation", "reasoning"],
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

    // Compute final trust score (weighted)
    const auth = analysis.document_authenticity_score ?? 0;
    const face = analysis.face_match_score ?? 0;
    const live = analysis.liveness_score ?? 0;
    const trust = Math.round((auth * 0.35 + face * 0.4 + live * 0.25) * 10); // 0-1000

    let status: "verified" | "flagged" | "rejected";
    if (analysis.recommendation === "approve" && trust >= 700) status = "verified";
    else if (analysis.recommendation === "reject" || trust < 350) status = "rejected";
    else status = "flagged";

    await admin
      .from("verification_sessions")
      .update({
        status,
        trust_score: trust,
        ai_analysis: analysis,
        completed_at: new Date().toISOString(),
      })
      .eq("id", session.id);

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
