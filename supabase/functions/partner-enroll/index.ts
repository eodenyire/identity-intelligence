import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const Body = z.object({
  name: z.string().trim().min(2).max(120),
  license_number: z.string().trim().max(60).optional(),
  country: z.string().trim().max(60).optional(),
});
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Unauthorized" }, 401);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: u } = await admin.auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) return json({ error: "Unauthorized" }, 401);
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);

  const { error: oErr } = await admin.from("partner_organizations")
    .upsert({ user_id: u.user.id, ...parsed.data }, { onConflict: "user_id" });
  if (oErr) return json({ error: oErr.message }, 400);
  const { error: rErr } = await admin.from("user_roles")
    .upsert({ user_id: u.user.id, role: "partner" }, { onConflict: "user_id,role" });
  if (rErr) return json({ error: rErr.message }, 400);
  await admin.from("audit_log").insert({ user_id: u.user.id, actor: "partner", action: "partner.enrolled", details: parsed.data });
  return json({ ok: true });
});
