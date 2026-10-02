import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const Body = z.object({ session_ids: z.array(z.string().uuid()).min(1).max(30), notes: z.string().max(2000).optional() });
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return json({ error: "Unauthorized" }, 401);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);

    // RLS restricts to the analyst's own sessions
    const { data: rows, error } = await supabase
      .from("verification_sessions")
      .select("id,customer_name,customer_email,customer_phone,country,id_type,status,trust_score,device_fingerprint,liveness_challenge,ai_analysis,created_at")
      .in("id", parsed.data.session_ids);
    if (error) return json({ error: error.message }, 400);
    if (!rows?.length) return json({ error: "No matching sessions" }, 404);

    const cluster = rows.map((r: any) => ({
      id: r.id.slice(0, 8),
      name: r.customer_name,
      email: r.customer_email,
      phone: r.customer_phone,
      country: r.country,
      id_type: r.id_type,
      status: r.status,
      trust_score: r.trust_score,
      device: r.device_fingerprint?.slice(0, 16) ?? null,
      liveness: r.liveness_challenge,
      risk_signals: r.ai_analysis?.risk_signals ?? [],
      deepfake_signals: r.ai_analysis?.deepfake_signals ?? [],
      created_at: r.created_at,
    }));

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI is not configured" }, 500);

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      signal: req.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions:
          "You are a senior fraud/KYC analyst. Given a cluster of identity verification sessions, write a concise markdown report with sections: ## Summary, ## Shared signals (which emails/phones/devices/countries/AI risk signals are shared and by whom), ## Risk assessment (Low/Medium/High with reasoning), ## Recommended review steps (numbered, concrete). Under 350 words. Do not invent facts beyond the data.",
        input: `Analyst notes: ${parsed.data.notes || "none"}\n\nCluster data:\n${JSON.stringify(cluster, null, 2)}`,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const t = await upstream.text();
      let msg = "AI request failed";
      try { msg = JSON.parse(t)?.error?.message ?? JSON.parse(t)?.message ?? msg; } catch { /* noop */ }
      return json({ error: msg }, upstream.status);
    }

    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const stream = new ReadableStream({
      async start(ctrl) {
        const reader = upstream.body!.getReader();
        let buf = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data:")) continue;
              const d = line.slice(5).trim();
              if (!d || d === "[DONE]") continue;
              try {
                const ev = JSON.parse(d);
                if (ev.type === "response.output_text.delta" && ev.delta) ctrl.enqueue(enc.encode(ev.delta));
                if (ev.type === "response.failed" || ev.type === "error")
                  ctrl.enqueue(enc.encode("\n\n[Analysis failed: " + (ev.error?.message ?? ev.response?.error?.message ?? "unknown") + "]"));
              } catch { /* partial */ }
            }
          }
        } catch (_) { /* aborted */ }
        ctrl.close();
      },
    });

    await supabase.from("audit_log").insert({ user_id: u.user.id, actor: "analyst", action: "cluster.ai_analysis", details: { sessions: parsed.data.session_ids } }).then(() => {}, () => {});

    const h = new Headers({ ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" });
    const runId = upstream.headers.get("X-Lovable-AIG-Run-ID");
    if (runId) h.set("X-Lovable-AIG-Run-ID", runId);
    return new Response(stream, { headers: h });
  } catch (e) {
    if ((e as Error).name === "AbortError") return new Response(null, { status: 499, headers: corsHeaders });
    return json({ error: (e as Error).message }, 500);
  }
});
