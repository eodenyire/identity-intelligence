import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { generateToken, statusColor, scoreColor } from "@/lib/kyc";
import { Building2, Copy, Link2, Loader2, Plus, Webhook } from "lucide-react";

interface Org { name: string; license_number: string | null; country: string | null }
interface Row { id: string; public_token: string; customer_name: string; status: string; trust_score: number | null; created_at: string }

const Partner = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [org, setOrg] = useState<Org | null | undefined>(undefined);
  const [rows, setRows] = useState<Row[]>([]);
  const [hooks, setHooks] = useState(0);
  const [form, setForm] = useState({ name: "", license_number: "", country: "Kenya" });
  const [cust, setCust] = useState({ customer_name: "", customer_email: "", customer_phone: "", country: "Kenya" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data: o } = await supabase.from("partner_organizations").select("name,license_number,country").maybeSingle();
    setOrg(o ?? null);
    if (!o) return;
    const [{ data: s }, { count }] = await Promise.all([
      supabase.from("verification_sessions").select("id,public_token,customer_name,status,trust_score,created_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("webhook_endpoints").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]);
    setRows((s as Row[]) ?? []);
    setHooks(count ?? 0);
  };
  useEffect(() => { load(); }, [user]);

  const enroll = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("partner-enroll", { body: form });
    setBusy(false);
    if (error || (data as any)?.error) return toast({ title: "Could not register bank", description: String((data as any)?.error ?? error?.message), variant: "destructive" });
    load();
  };

  const createSession = async () => {
    if (!user || cust.customer_name.trim().length < 2) return;
    setBusy(true);
    const token = generateToken();
    const { error } = await supabase.from("verification_sessions").insert({
      user_id: user.id, public_token: token,
      customer_name: cust.customer_name.trim(),
      customer_email: cust.customer_email || null,
      customer_phone: cust.customer_phone || null,
      country: cust.country || null,
    });
    setBusy(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    copyLink(token);
    setCust({ ...cust, customer_name: "", customer_email: "", customer_phone: "" });
    load();
  };

  const copyLink = (t: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/verify/${t}`);
    toast({ title: "Verification link copied", description: "Send it to your customer." });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 container mx-auto px-6 max-w-5xl">
        <h1 className="text-3xl font-display font-bold mb-1 flex items-center gap-2"><Building2 className="w-7 h-7 text-primary" /> Partner dashboard</h1>
        <p className="text-muted-foreground mb-6">Onboard your bank's customers and receive verified results on your systems.</p>

        {org === undefined ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : org === null ? (
          <div className="glass rounded-xl p-6 max-w-lg space-y-3">
            <h2 className="font-display font-semibold">Register your bank</h2>
            <Input placeholder="Bank / institution name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Licence number (optional)" value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} />
            <Input placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            <Button onClick={enroll} disabled={busy || form.name.trim().length < 2}>{busy && <Loader2 className="w-4 h-4 animate-spin" />} Register as partner</Button>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="glass rounded-xl p-4"><div className="text-xs text-muted-foreground">Institution</div><div className="font-display font-semibold">{org.name}</div><div className="text-xs text-muted-foreground">{[org.license_number, org.country].filter(Boolean).join(" · ")}</div></div>
              <div className="glass rounded-xl p-4"><div className="text-xs text-muted-foreground">Sessions</div><div className="text-2xl font-display font-bold">{rows.length}</div></div>
              <Link to="/webhooks" className="glass rounded-xl p-4 hover:border-primary/50 border border-transparent">
                <div className="text-xs text-muted-foreground flex items-center gap-1"><Webhook className="w-3 h-3" /> Result webhooks</div>
                <div className="text-2xl font-display font-bold">{hooks}</div>
                <div className={`text-xs ${hooks ? "text-emerald-glow" : "text-amber-glow"}`}>{hooks ? "Results are delivered to your systems" : "Add an endpoint to receive results"}</div>
              </Link>
            </div>

            <div className="glass rounded-xl p-6 mb-6">
              <h2 className="font-display font-semibold mb-3 flex items-center gap-2"><Plus className="w-4 h-4" /> New customer onboarding</h2>
              <div className="grid md:grid-cols-4 gap-3">
                <Input placeholder="Full name" value={cust.customer_name} onChange={(e) => setCust({ ...cust, customer_name: e.target.value })} />
                <Input placeholder="Email" value={cust.customer_email} onChange={(e) => setCust({ ...cust, customer_email: e.target.value })} />
                <Input placeholder="Phone" value={cust.customer_phone} onChange={(e) => setCust({ ...cust, customer_phone: e.target.value })} />
                <Input placeholder="Country" value={cust.country} onChange={(e) => setCust({ ...cust, country: e.target.value })} />
              </div>
              <Button className="mt-3" onClick={createSession} disabled={busy || cust.customer_name.trim().length < 2}><Link2 className="w-4 h-4" /> Create & copy verify link</Button>
            </div>

            <div className="glass rounded-xl divide-y divide-border">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-4 flex-wrap">
                  <Link to={`/onboarding/${r.id}`} className="font-medium flex-1 min-w-[140px] hover:text-primary">{r.customer_name}</Link>
                  <span className={`text-xs font-mono px-2 py-1 rounded-full ${statusColor(r.status)}`}>{r.status}</span>
                  <span className={`font-mono text-sm w-12 text-right ${scoreColor(r.trust_score)}`}>{r.trust_score ?? "—"}</span>
                  <Button size="sm" variant="ghost" onClick={() => copyLink(r.public_token)}><Copy className="w-4 h-4" /></Button>
                </div>
              ))}
              {rows.length === 0 && <p className="p-6 text-sm text-muted-foreground">No sessions yet.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Partner;
