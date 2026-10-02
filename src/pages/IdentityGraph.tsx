import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/landing/Navbar";
import IdentityGraph, { GraphNode, GraphEdge } from "@/components/dashboard/IdentityGraph";
import ClusterAnalyst from "@/components/dashboard/ClusterAnalyst";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, AlertTriangle, Users, Network, Loader2 } from "lucide-react";

interface SessionRow {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  country: string | null;
  status: string;
  trust_score: number | null;
  device_fingerprint: string | null;
  ai_analysis: any;
}

const CX = 550;
const CY = 350;

/** Deterministic pseudo-random from a string id (stable layout across renders). */
const seeded = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h / 0xffffffff;
};

const buildGraph = (sessions: SessionRow[]) => {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const attrCount: Record<string, number> = {};

  sessions.forEach((s, i) => {
    const angle = (i / Math.max(sessions.length, 1)) * Math.PI * 2;
    const ux = CX + Math.cos(angle) * 220 + seeded(s.id) * 60;
    const uy = CY + Math.sin(angle) * 180 + seeded(s.id + "y") * 60;
    const flagged = s.status === "flagged" || s.status === "rejected";

    nodes.push({
      id: `u_${s.id}`,
      label: s.customer_name.split(" ").map((p, j) => (j === 0 ? p : p[0] + ".")).join(" "),
      type: "user",
      x: ux,
      y: uy,
      trustScore: s.trust_score ?? undefined,
      detail: s.status,
      flagged,
    });

    const link = (
      key: string,
      value: string | null,
      type: GraphNode["type"],
      label: string,
      detail?: string,
    ) => {
      if (!value) return;
      attrCount[key] = (attrCount[key] ?? 0) + 1;
      if (!nodes.find((n) => n.id === key)) {
        nodes.push({
          id: key,
          label,
          type,
          x: ux + (seeded(key) - 0.5) * 260,
          y: uy + (seeded(key + "p") - 0.5) * 260,
          detail,
        });
      }
      edges.push({ source: `u_${s.id}`, target: key, strength: 0.9 });
    };

    link(`e_${s.customer_email}`, s.customer_email, "email", s.customer_email!);
    link(`p_${s.customer_phone}`, s.customer_phone, "phone", s.customer_phone!);
    link(
      `d_${s.device_fingerprint}`,
      s.device_fingerprint,
      "device",
      s.device_fingerprint?.slice(0, 12) ?? "",
      "Device fingerprint",
    );
    link(`l_${s.country}`, s.country, "location", s.country!);

    // Fraud signals from AI analysis
    const signals: string[] = [
      ...(s.ai_analysis?.risk_signals ?? []),
      ...(s.ai_analysis?.deepfake_signals ?? []),
    ];
    signals.slice(0, 4).forEach((sig, j) => {
      const fid = `f_${s.id}_${j}`;
      nodes.push({
        id: fid,
        label: sig.length > 26 ? sig.slice(0, 26) + "…" : sig,
        type: "fraud_signal",
        x: ux + (seeded(fid) - 0.5) * 300,
        y: uy + 140 + seeded(fid + "q") * 80,
        detail: sig,
        flagged: true,
      });
      edges.push({ source: `u_${s.id}`, target: fid, strength: 1, suspicious: true });
    });
  });

  // Flag shared attributes (same email/phone/device across multiple people) as suspicious
  Object.entries(attrCount).forEach(([key, count]) => {
    if (count > 1) {
      const node = nodes.find((n) => n.id === key);
      if (node) {
        node.flagged = true;
        node.detail = `Shared by ${count} identities`;
      }
      edges.forEach((e) => {
        if (e.target === key) {
          e.suspicious = true;
          e.label = "Shared";
        }
      });
    }
  });

  return { nodes, edges };
};

const IdentityGraphPage = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("verification_sessions")
      .select(
        "id,customer_name,customer_email,customer_phone,country,status,trust_score,device_fingerprint,ai_analysis",
      )
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setSessions((data as SessionRow[]) ?? []));
  }, [user]);

  const { nodes, edges } = useMemo(
    () => (sessions ? buildGraph(sessions) : { nodes: [], edges: [] }),
    [sessions],
  );

  const summary = useMemo(() => {
    const flaggedNodes = nodes.filter((n) => n.flagged).length;
    const verified = sessions?.filter((s) => s.status === "verified").length ?? 0;
    return [
      { icon: Users, label: "Entities Tracked", value: String(nodes.length), color: "text-primary" },
      { icon: Network, label: "Connections", value: String(edges.length), color: "text-violet-glow" },
      { icon: ShieldCheck, label: "Verified", value: String(verified), color: "text-emerald-glow" },
      { icon: AlertTriangle, label: "Flagged", value: String(flaggedNodes), color: "text-rose-glow" },
    ];
  }, [nodes, edges, sessions]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 container mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold mb-1">Identity Graph</h1>
          <p className="text-muted-foreground mb-6">
            Live view of your verification sessions — shared emails, phones, and devices are flagged as suspicious links
          </p>
        </motion.div>

        {/* Risk Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {summary.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <div>
                  <div className="text-xl font-display font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Graph */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-xl overflow-hidden"
          style={{ height: "calc(100vh - 320px)", minHeight: 400 }}
        >
          {sessions === null ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Network className="w-8 h-8 opacity-50" />
              <p className="text-sm">No verification sessions yet — create one in Onboarding to populate the graph.</p>
            </div>
          ) : (
            <IdentityGraph nodes={nodes} edges={edges} />
          )}
        </motion.div>
        {sessions && sessions.length > 0 && (
          <ClusterAnalyst
            sessions={sessions}
            suggested={(() => {
              const shared = new Set(edges.filter((e) => e.suspicious && e.label === "Shared").map((e) => e.source.slice(2)));
              return sessions.filter((s) => shared.has(s.id)).map((s) => s.id);
            })()}
          />
        )}
      </div>
    </div>
  );
};

export default IdentityGraphPage;
