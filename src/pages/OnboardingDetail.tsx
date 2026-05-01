import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { statusColor, scoreColor } from "@/lib/kyc";
import {
  ArrowLeft,
  ShieldCheck,
  XCircle,
  FileText,
  Camera,
  Sparkles,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

interface Session {
  id: string;
  user_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  country: string | null;
  id_type: string;
  status: string;
  trust_score: number | null;
  ai_analysis: any;
  reviewer_notes: string | null;
  created_at: string;
  completed_at: string | null;
  public_token: string;
}

interface Doc {
  id: string;
  doc_type: string;
  storage_path: string;
}

const OnboardingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    const { data: s } = await supabase
      .from("verification_sessions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!s) {
      setLoading(false);
      return;
    }
    setSession(s as Session);
    setNotes(s.reviewer_notes ?? "");

    const { data: d } = await supabase
      .from("verification_documents")
      .select("id,doc_type,storage_path")
      .eq("session_id", id);
    setDocs((d as Doc[]) ?? []);

    // signed URLs
    const urls: Record<string, string> = {};
    for (const doc of d ?? []) {
      const { data: signed } = await supabase.storage
        .from("verifications")
        .createSignedUrl(doc.storage_path, 3600);
      if (signed) urls[doc.id] = signed.signedUrl;
    }
    setDocUrls(urls);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id]);

  const updateStatus = async (newStatus: "verified" | "rejected") => {
    if (!session) return;
    const { error } = await supabase
      .from("verification_sessions")
      .update({
        status: newStatus,
        reviewer_notes: notes,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", session.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Marked as ${newStatus}` });
    // dispatch webhook
    supabase.functions.invoke("dispatch-webhook", {
      body: {
        user_id: session.user_id,
        session_id: session.id,
        event_type: `verification.${newStatus}`,
      },
    });
    load();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 container mx-auto px-6 text-center">
          <p className="text-muted-foreground">Session not found.</p>
          <Button variant="hero-outline" size="sm" className="mt-4" asChild>
            <Link to="/onboarding">Back</Link>
          </Button>
        </div>
      </div>
    );
  }

  const a = session.ai_analysis;
  const canReview = session.status === "flagged" || session.status === "in_progress";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 container mx-auto px-6 max-w-5xl">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/onboarding")}>
          <ArrowLeft className="w-4 h-4" /> All sessions
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
            <div>
              <h1 className="text-3xl font-display font-bold">{session.customer_name}</h1>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                {session.customer_email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-4 h-4" /> {session.customer_email}
                  </span>
                )}
                {session.customer_phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-4 h-4" /> {session.customer_phone}
                  </span>
                )}
                {session.country && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {session.country}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-mono px-3 py-1.5 rounded-full ${statusColor(
                  session.status,
                )}`}
              >
                {session.status}
              </span>
              <div className="text-right">
                <div className={`text-3xl font-display font-bold ${scoreColor(session.trust_score)}`}>
                  {session.trust_score ?? "—"}
                </div>
                <div className="text-xs text-muted-foreground">Trust score</div>
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          {a ? (
            <div className="glass rounded-xl p-6 mb-6">
              <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> AI Analysis
              </h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {[
                  { label: "Document authenticity", v: a.document_authenticity_score },
                  { label: "Face match", v: a.face_match_score },
                  { label: "Liveness", v: a.liveness_score },
                ].map((m) => (
                  <div key={m.label} className="bg-secondary/50 rounded-lg p-3 text-center">
                    <div
                      className={`text-2xl font-display font-bold ${
                        m.v >= 70 ? "text-emerald-glow" : m.v >= 40 ? "text-amber-glow" : "text-rose-glow"
                      }`}
                    >
                      {Math.round(m.v ?? 0)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{m.label}</div>
                  </div>
                ))}
              </div>
              {a.ocr && (
                <div className="mb-4">
                  <div className="text-xs font-mono text-muted-foreground mb-2">OCR EXTRACTED</div>
                  <div className="grid grid-cols-2 gap-3 text-sm bg-secondary/30 rounded-lg p-4">
                    {Object.entries(a.ocr).map(([k, v]) => (
                      <div key={k}>
                        <div className="text-xs text-muted-foreground">{k.replace(/_/g, " ")}</div>
                        <div className="font-mono">{String(v) || "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {a.risk_signals?.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-mono text-muted-foreground mb-2">RISK SIGNALS</div>
                  <ul className="space-y-1">
                    {a.risk_signals.map((r: string, i: number) => (
                      <li key={i} className="text-sm text-amber-glow flex gap-2">
                        <span>•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {a.reasoning && (
                <div>
                  <div className="text-xs font-mono text-muted-foreground mb-1">AI REASONING</div>
                  <p className="text-sm text-foreground/80">{a.reasoning}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="glass rounded-xl p-6 mb-6 text-center text-muted-foreground">
              <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                No AI analysis yet. The customer hasn't completed their verification.
              </p>
              <Button variant="hero-outline" size="sm" className="mt-3" asChild>
                <a href={`/verify/${session.public_token}`} target="_blank" rel="noreferrer">
                  Open verification link
                </a>
              </Button>
            </div>
          )}

          {/* Documents */}
          {docs.length > 0 && (
            <div className="glass rounded-xl p-6 mb-6">
              <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Captured Documents
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {docs.map((d) => (
                  <div key={d.id} className="bg-secondary/50 rounded-lg overflow-hidden">
                    {docUrls[d.id] ? (
                      <img
                        src={docUrls[d.id]}
                        alt={d.doc_type}
                        className="w-full h-32 object-cover"
                      />
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center">
                        <Camera className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="p-2 text-xs text-center capitalize text-muted-foreground">
                      {d.doc_type.replace("_", " ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviewer notes & actions */}
          {canReview && (
            <div className="glass rounded-xl p-6">
              <h3 className="font-display font-semibold mb-3">Manual Review</h3>
              <Textarea
                placeholder="Add reviewer notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-secondary border-border mb-4"
                rows={3}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="hero-outline"
                  size="sm"
                  onClick={() => updateStatus("rejected")}
                >
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
                <Button variant="hero" size="sm" onClick={() => updateStatus("verified")}>
                  <ShieldCheck className="w-4 h-4" /> Approve
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default OnboardingDetail;
