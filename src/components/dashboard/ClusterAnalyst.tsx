import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Square } from "lucide-react";

interface S { id: string; customer_name: string; status: string; trust_score: number | null }

const ClusterAnalyst = ({ sessions, suggested }: { sessions: S[]; suggested: string[] }) => {
  const [selected, setSelected] = useState<string[]>(suggested);
  const [notes, setNotes] = useState("");
  const [out, setOut] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const ctrl = useRef<AbortController | null>(null);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const run = async () => {
    setOut(""); setErr(""); setBusy(true);
    ctrl.current = new AbortController();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/analyze-cluster`, {
        method: "POST",
        signal: ctrl.current.signal,
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ session_ids: selected, notes }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(typeof j.error === "string" ? j.error : `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setOut((o) => o + dec.decode(value, { stream: true }));
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass rounded-xl p-5 mt-6">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="font-display font-semibold text-lg">AI Cluster Analyst</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Pick the identities in a suspicious cluster. AI summarizes their shared signals and recommends review steps.
      </p>
      <div className="flex flex-wrap gap-2 mb-3 max-h-40 overflow-auto">
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => toggle(s.id)}
            className={`text-xs font-mono px-2.5 py-1 rounded-md border transition-colors ${
              selected.includes(s.id) ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            {s.customer_name} · {s.status}{s.trust_score != null ? ` · ${s.trust_score}` : ""}
          </button>
        ))}
      </div>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional analyst notes (why this cluster looks suspicious)…"
        maxLength={2000}
        className="mb-3"
      />
      <div className="flex gap-2">
        <Button onClick={run} disabled={busy || selected.length === 0}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Analyze {selected.length} {selected.length === 1 ? "identity" : "identities"}
        </Button>
        {busy && (
          <Button variant="outline" onClick={() => ctrl.current?.abort()}>
            <Square className="w-4 h-4" /> Stop
          </Button>
        )}
      </div>
      {err && <p className="text-sm text-destructive mt-3">{err}</p>}
      {out && (
        <pre className="mt-4 whitespace-pre-wrap text-sm text-foreground font-sans bg-muted/30 rounded-lg p-4 border border-border">{out}</pre>
      )}
    </div>
  );
};

export default ClusterAnalyst;
