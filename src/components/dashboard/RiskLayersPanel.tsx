import { FileText, ScanFace, Keyboard, Globe, Smartphone, Gauge } from "lucide-react";
import { scoreColor } from "@/lib/kyc";

const LAYERS = [
  { key: "document", label: "Document", icon: FileText },
  { key: "biometric", label: "Face", icon: ScanFace },
  { key: "behavior", label: "Behaviour", icon: Keyboard },
  { key: "network", label: "Location", icon: Globe },
  { key: "device", label: "Device", icon: Smartphone },
] as const;

const barColor = (s: number) => (s >= 70 ? "bg-emerald-glow" : s >= 40 ? "bg-amber-glow" : "bg-rose-glow");

const detailFor = (key: string, l: any): string | null => {
  if (key === "biometric") return `Deepfake ${l.deepfake_score ?? "—"} · challenge ${l.liveness_challenge_passed === false ? "failed" : l.liveness_challenge_passed ? "passed" : "n/a"}`;
  if (key === "behavior") return `${l.keystrokes ?? 0} keystrokes · rhythm ${l.rhythm_cv ?? "—"}`;
  if (key === "network") return [l.ip_city, l.ip_country, l.isp].filter(Boolean).join(" · ") || null;
  if (key === "device") return `Reused by ${l.reuse_count ?? 0} other identities`;
  return null;
};

const RiskLayersPanel = ({ layers, trust }: { layers: any; trust: number | null }) => {
  if (!layers) return null;
  return (
    <div className="glass rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <Gauge className="w-5 h-5 text-primary" /> Score by check
        </h3>
        <div className="text-right">
          <span className={`text-2xl font-display font-bold ${scoreColor(trust)}`}>{trust ?? "—"}</span>
          <span className="text-xs text-muted-foreground"> / 1000 total</span>
        </div>
      </div>
      <div className="space-y-4">
        {LAYERS.map(({ key, label, icon: Icon }) => {
          const l = layers[key];
          if (!l) return null;
          const d = detailFor(key, l);
          return (
            <div key={key}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="flex items-center gap-2 text-foreground">
                  <Icon className="w-4 h-4 text-muted-foreground" /> {label}
                  <span className="text-xs text-muted-foreground font-mono">×{Math.round((l.weight ?? 0) * 100)}%</span>
                </span>
                <span className="font-mono">{l.score}/100</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full ${barColor(l.score)}`} style={{ width: `${l.score}%` }} />
              </div>
              {d && <p className="text-xs text-muted-foreground mt-1 font-mono">{d}</p>}
              {l.signals?.length > 0 && (
                <ul className="mt-1 text-xs text-amber-glow list-disc list-inside">
                  {l.signals.map((s: string) => <li key={s}>{s}</li>)}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RiskLayersPanel;
