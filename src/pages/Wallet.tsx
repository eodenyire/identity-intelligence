import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Wallet as WalletIcon,
  Copy,
  Check,
  ShieldCheck,
  XCircle,
  Loader2,
  Search,
  ExternalLink,
} from "lucide-react";

interface Credential {
  id: string;
  credential_id: string;
  subject_name: string;
  subject_country: string | null;
  trust_score: number | null;
  jwt: string;
  issued_at: string;
  expires_at: string;
  revoked_at: string | null;
  session_id: string;
}

const Wallet = () => {
  const { user } = useAuth();
  const [creds, setCreds] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [verifyJwt, setVerifyJwt] = useState("");
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("identity_credentials")
      .select("*")
      .order("issued_at", { ascending: false });
    setCreds((data as Credential[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Credential JWT copied");
    setTimeout(() => setCopiedId(null), 1500);
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this credential? It will no longer verify successfully.")) return;
    const { error } = await supabase
      .from("identity_credentials")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Credential revoked");
    load();
  };

  const runVerify = async () => {
    if (!verifyJwt.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    const { data, error } = await supabase.functions.invoke("verify-credential", {
      body: { jwt: verifyJwt.trim() },
    });
    if (error) toast.error(error.message);
    setVerifyResult(data);
    setVerifying(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 container mx-auto px-6 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <WalletIcon className="w-7 h-7 text-primary" />
            <h1 className="text-3xl font-display font-bold">Identity Wallet</h1>
          </div>
          <p className="text-muted-foreground mb-8">
            Reusable signed credentials issued to verified customers — no repeated onboarding.
          </p>

          {/* Verify-a-credential tool */}
          <div className="glass rounded-xl p-6 mb-8">
            <h2 className="font-display font-semibold mb-3 flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" /> Verify a credential
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              Paste a TrustLayer credential JWT to check signature, expiry, and revocation status.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="eyJhbGciOiJIUzI1NiIs..."
                value={verifyJwt}
                onChange={(e) => setVerifyJwt(e.target.value)}
                className="font-mono text-xs bg-secondary/50 border-border"
              />
              <Button onClick={runVerify} disabled={verifying} variant="hero" size="sm">
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
              </Button>
            </div>
            {verifyResult && (
              <div
                className={`mt-3 p-3 rounded-lg text-sm ${
                  verifyResult.valid
                    ? "bg-emerald-glow/10 text-emerald-glow border border-emerald-glow/30"
                    : "bg-rose-glow/10 text-rose-glow border border-rose-glow/30"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold mb-1">
                  {verifyResult.valid ? (
                    <ShieldCheck className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  {verifyResult.valid ? "Valid credential" : "Invalid"}
                  {verifyResult.reason ? ` — ${verifyResult.reason}` : ""}
                </div>
                {verifyResult.valid && verifyResult.record && (
                  <pre className="text-xs font-mono text-foreground/80 overflow-x-auto">
                    {JSON.stringify(verifyResult.record, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* Issued credentials */}
          <h2 className="font-display font-semibold mb-3">Issued credentials</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : creds.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center">
              <WalletIcon className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-1">No credentials issued yet.</p>
              <p className="text-sm text-muted-foreground">
                Credentials are auto-issued when a verification session is approved.
              </p>
              <Button variant="hero-outline" size="sm" className="mt-4" asChild>
                <Link to="/onboarding">Go to verifications</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {creds.map((c) => {
                const expired = new Date(c.expires_at) < new Date();
                const status = c.revoked_at ? "revoked" : expired ? "expired" : "active";
                const statusClass =
                  status === "active"
                    ? "bg-emerald-glow/15 text-emerald-glow"
                    : status === "revoked"
                    ? "bg-rose-glow/15 text-rose-glow"
                    : "bg-muted text-muted-foreground";
                return (
                  <div key={c.id} className="glass rounded-xl p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="font-display font-semibold">{c.subject_name}</div>
                        <div className="text-xs font-mono text-muted-foreground mt-0.5">
                          {c.credential_id}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                          {c.subject_country && <span>Country: {c.subject_country}</span>}
                          <span>Trust: {c.trust_score ?? "—"}</span>
                          <span>Issued: {new Date(c.issued_at).toLocaleDateString()}</span>
                          <span>Expires: {new Date(c.expires_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-mono px-2.5 py-1 rounded-full ${statusClass}`}
                        >
                          {status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 bg-secondary/40 rounded-lg p-3 font-mono text-[10px] break-all text-muted-foreground">
                      {c.jwt}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="hero-outline" onClick={() => copy(c.jwt, c.id)}>
                        {copiedId === c.id ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}{" "}
                        Copy JWT
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/onboarding/${c.session_id}`}>
                          <ExternalLink className="w-4 h-4" /> Session
                        </Link>
                      </Button>
                      {!c.revoked_at && (
                        <Button size="sm" variant="ghost" onClick={() => revoke(c.id)}>
                          <XCircle className="w-4 h-4" /> Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Wallet;
