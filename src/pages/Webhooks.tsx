import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { generateSecret } from "@/lib/kyc";
import { Webhook, Plus, Trash2, Copy, Check, Activity } from "lucide-react";

interface Hook {
  id: string;
  label: string;
  url: string;
  signing_secret: string;
  enabled_events: string[];
  is_active: boolean;
  created_at: string;
}

interface Delivery {
  id: string;
  webhook_id: string;
  event_type: string;
  response_status: number | null;
  created_at: string;
}

const ALL_EVENTS = [
  "verification.completed",
  "verification.verified",
  "verification.flagged",
  "verification.rejected",
];

const Webhooks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const { data: h } = await supabase
      .from("webhook_endpoints")
      .select("*")
      .order("created_at", { ascending: false });
    setHooks((h as Hook[]) ?? []);
    const { data: d } = await supabase
      .from("webhook_deliveries")
      .select("id,webhook_id,event_type,response_status,created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setDeliveries((d as Delivery[]) ?? []);
  };

  useEffect(() => {
    load();
  }, [user]);

  const create = async () => {
    if (!user || !label.trim() || !url.trim()) return;
    try {
      new URL(url);
    } catch {
      toast({ title: "Invalid URL", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("webhook_endpoints").insert({
      user_id: user.id,
      label: label.trim(),
      url: url.trim(),
      signing_secret: generateSecret(),
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setLabel("");
    setUrl("");
    setShowCreate(false);
    toast({ title: "Webhook added" });
    load();
  };

  const toggleActive = async (h: Hook) => {
    await supabase
      .from("webhook_endpoints")
      .update({ is_active: !h.is_active })
      .eq("id", h.id);
    load();
  };

  const toggleEvent = async (h: Hook, event: string) => {
    const next = h.enabled_events.includes(event)
      ? h.enabled_events.filter((e) => e !== event)
      : [...h.enabled_events, event];
    await supabase
      .from("webhook_endpoints")
      .update({ enabled_events: next })
      .eq("id", h.id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("webhook_endpoints").delete().eq("id", id);
    toast({ title: "Webhook removed" });
    load();
  };

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1800);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 container mx-auto px-6 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
            <div>
              <h1 className="text-3xl font-display font-bold mb-1">Webhooks</h1>
              <p className="text-muted-foreground">
                Push verification events to your bank or partner system in real time
              </p>
            </div>
            <Button variant="hero" size="sm" onClick={() => setShowCreate((v) => !v)}>
              <Plus className="w-4 h-4" /> Add Endpoint
            </Button>
          </div>

          {showCreate && (
            <div className="glass rounded-xl p-5 mb-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="label">Label</Label>
                  <Input
                    id="label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Production bank backend"
                    className="bg-secondary border-border mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="url">Endpoint URL</Label>
                  <Input
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://api.yourbank.com/trustlayer/webhook"
                    className="bg-secondary border-border mt-1"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button variant="hero" size="sm" onClick={create}>
                  Create
                </Button>
              </div>
            </div>
          )}

          {/* Endpoints list */}
          <div className="space-y-3 mb-8">
            {hooks.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center text-muted-foreground">
                <Webhook className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No webhook endpoints yet.</p>
              </div>
            ) : (
              hooks.map((h) => (
                <div key={h.id} className="glass rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Webhook className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-foreground">{h.label}</span>
                        <span
                          className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                            h.is_active
                              ? "bg-emerald-glow/10 text-emerald-glow"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {h.is_active ? "Active" : "Paused"}
                        </span>
                      </div>
                      <code className="text-xs font-mono text-muted-foreground break-all">
                        {h.url}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={h.is_active} onCheckedChange={() => toggleActive(h)} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-rose-glow"
                        onClick={() => remove(h.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <code className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded flex-1 truncate">
                      {h.signing_secret}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => copy(h.signing_secret, h.id)}
                      title="Copy signing secret"
                    >
                      {copied === h.id ? <Check className="w-4 h-4 text-emerald-glow" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {ALL_EVENTS.map((e) => {
                      const on = h.enabled_events.includes(e);
                      return (
                        <button
                          key={e}
                          onClick={() => toggleEvent(h, e)}
                          className={`text-xs font-mono px-2 py-1 rounded-full border transition-colors ${
                            on
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "bg-secondary border-border text-muted-foreground"
                          }`}
                        >
                          {e}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Recent deliveries */}
          <div className="glass rounded-xl p-6">
            <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Recent deliveries
            </h3>
            {deliveries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No deliveries yet.
              </p>
            ) : (
              <div className="space-y-2">
                {deliveries.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between text-sm border-b border-border/30 py-2"
                  >
                    <span className="font-mono text-xs text-muted-foreground">{d.event_type}</span>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                          d.response_status && d.response_status >= 200 && d.response_status < 300
                            ? "bg-emerald-glow/10 text-emerald-glow"
                            : "bg-rose-glow/10 text-rose-glow"
                        }`}
                      >
                        {d.response_status ?? "failed"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(d.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Webhooks;
