import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play, Copy, Check, ChevronDown } from "lucide-react";

const endpoints = [
  {
    method: "POST",
    path: "/v1/verify/identity",
    label: "Full KYC Verification",
    description: "Run document + face + liveness verification in one call.",
    request: `{
  "document": {
    "type": "national_id",
    "country": "KE",
    "number": "32456789"
  },
  "biometric": {
    "face_image": "base64_encoded...",
    "liveness_check": true
  },
  "checks": ["document", "face_match", "aml", "sanctions"]
}`,
    response: `{
  "verification_id": "vrf_8842xK9mP2",
  "status": "verified",
  "trust_score": 923,
  "checks": {
    "document": { "status": "passed", "confidence": 0.98 },
    "face_match": { "status": "passed", "similarity": 0.96 },
    "liveness": { "status": "passed", "score": 0.99 },
    "aml": { "status": "clear" },
    "sanctions": { "status": "clear" }
  },
  "risk_level": "low",
  "created_at": "2026-03-30T14:22:11Z"
}`,
  },
  {
    method: "GET",
    path: "/v1/trust-score/{user_id}",
    label: "Trust Score Lookup",
    description: "Retrieve the real-time identity trust score for a user.",
    request: `// GET /v1/trust-score/usr_7kQ2mN4xP1

// Headers:
{
  "Authorization": "Bearer sk_live_...",
  "X-Idempotency-Key": "req_unique_123"
}`,
    response: `{
  "user_id": "usr_7kQ2mN4xP1",
  "trust_score": 847,
  "breakdown": {
    "identity_signals": 312,
    "behavioral": 198,
    "device_reputation": 187,
    "graph_analysis": 150
  },
  "risk_flags": [],
  "last_verified": "2026-03-29T09:15:00Z",
  "score_trend": "stable"
}`,
  },
  {
    method: "POST",
    path: "/v1/graph/query",
    label: "Identity Graph Query",
    description: "Query the identity graph for fraud ring detection and relationship mapping.",
    request: `{
  "entity": {
    "type": "device",
    "fingerprint": "fp_9xM2kL4nQ7"
  },
  "depth": 2,
  "include": ["users", "devices", "fraud_signals"],
  "time_range": "30d"
}`,
    response: `{
  "query_id": "qry_3mK8xN2pL1",
  "entity": "fp_9xM2kL4nQ7",
  "connections": 4,
  "nodes": [
    { "type": "user", "id": "usr_7kQ2m", "trust_score": 847 },
    { "type": "user", "id": "usr_2nP4x", "trust_score": 312, "flags": ["velocity_anomaly"] },
    { "type": "device", "id": "fp_9xM2k", "reputation": "medium" },
    { "type": "device", "id": "fp_4kL7n", "reputation": "low", "flags": ["emulator"] }
  ],
  "fraud_probability": 0.34,
  "alert": "potential_account_linking"
}`,
  },
  {
    method: "POST",
    path: "/v1/verify/face",
    label: "Face Match + Liveness",
    description: "Verify a face against a reference image with deepfake detection.",
    request: `{
  "reference_image": "base64_encoded...",
  "live_capture": "base64_encoded...",
  "options": {
    "liveness_mode": "active",
    "deepfake_detection": true,
    "age_estimation": true
  }
}`,
    response: `{
  "match_id": "fmc_5xN9kM2pL4",
  "face_match": {
    "is_match": true,
    "similarity": 0.97,
    "confidence": "high"
  },
  "liveness": {
    "is_live": true,
    "score": 0.99,
    "method": "active_3d"
  },
  "deepfake": {
    "detected": false,
    "confidence": 0.01
  },
  "age_estimate": { "min": 28, "max": 34 },
  "processing_time_ms": 342
}`,
  },
];

const methodColors: Record<string, string> = {
  GET: "text-emerald-glow bg-emerald-glow/10",
  POST: "text-primary bg-primary/10",
};

const APIPlayground = () => {
  const [activeEndpoint, setActiveEndpoint] = useState(0);
  const [activeTab, setActiveTab] = useState<"request" | "response">("request");
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [copied, setCopied] = useState(false);

  const current = endpoints[activeEndpoint];

  const handleRun = () => {
    setIsRunning(true);
    setActiveTab("request");
    setTimeout(() => {
      setActiveTab("response");
      setIsRunning(false);
      setHasRun(true);
    }, 1200);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activeTab === "request" ? current.request : current.response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEndpointChange = (i: number) => {
    setActiveEndpoint(i);
    setActiveTab("request");
    setHasRun(false);
  };

  return (
    <section id="playground" className="py-32 relative">
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-xs font-mono text-primary uppercase tracking-widest">API Playground</span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mt-4 mb-6">
            Try It <span className="text-gradient-primary">Live</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            Explore TrustLayer's API with sample requests. No API key needed for the sandbox.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto"
        >
          {/* Endpoint selector */}
          <div className="flex flex-wrap gap-2 mb-6">
            {endpoints.map((ep, i) => (
              <button
                key={ep.path}
                onClick={() => handleEndpointChange(i)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeEndpoint === i
                    ? "bg-primary/10 text-primary border border-glow shadow-glow-sm"
                    : "glass text-muted-foreground hover:text-foreground"
                }`}
              >
                {ep.label}
              </button>
            ))}
          </div>

          {/* Main playground card */}
          <div className="glass rounded-2xl overflow-hidden border border-border">
            {/* Header bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${methodColors[current.method]}`}>
                  {current.method}
                </span>
                <span className="text-sm font-mono text-muted-foreground">{current.path}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-glow" /> : <Copy className="w-4 h-4" />}
                </button>
                <Button
                  variant="hero"
                  size="sm"
                  className="gap-2"
                  onClick={handleRun}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <>
                      <div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" /> Run
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Description */}
            <div className="px-6 py-3 border-b border-border/50">
              <p className="text-sm text-muted-foreground">{current.description}</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              {(["request", "response"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                    activeTab === tab ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "request" ? "Request" : "Response"}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="playground-tab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    />
                  )}
                  {tab === "response" && hasRun && (
                    <span className="ml-2 text-xs text-emerald-glow font-mono">200</span>
                  )}
                </button>
              ))}
            </div>

            {/* Code area */}
            <div className="relative">
              {isRunning && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span className="text-sm font-mono text-primary">Processing verification...</span>
                  </div>
                </motion.div>
              )}
              <AnimatePresence mode="wait">
                <motion.pre
                  key={`${activeEndpoint}-${activeTab}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="p-6 text-sm font-mono leading-relaxed overflow-x-auto max-h-[400px] overflow-y-auto text-foreground/90"
                >
                  <code>
                    {activeTab === "request" ? current.request : current.response}
                  </code>
                </motion.pre>
              </AnimatePresence>
            </div>

            {/* Footer */}
            {activeTab === "response" && hasRun && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-6 py-3 border-t border-border flex items-center justify-between text-xs font-mono text-muted-foreground"
              >
                <div className="flex items-center gap-4">
                  <span>Status: <span className="text-emerald-glow">200 OK</span></span>
                  <span>Time: <span className="text-primary">342ms</span></span>
                </div>
                <span>Sandbox Mode</span>
              </motion.div>
            )}
          </div>

          {/* SDK examples hint */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-8 flex flex-wrap justify-center gap-3"
          >
            {["cURL", "Python", "Node.js", "Go", "Ruby", "Java"].map((lang) => (
              <span
                key={lang}
                className="px-4 py-1.5 rounded-full border border-border text-xs font-mono text-muted-foreground hover:border-glow hover:text-primary transition-colors cursor-pointer"
              >
                {lang}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default APIPlayground;
