import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Shield, ArrowLeft, Copy, Check, Book, Code2, Zap, Key, Globe, ShieldCheck, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const sidebarSections = [
  { id: "getting-started", label: "Getting Started", icon: Zap, keywords: ["quick start", "install", "setup", "base url", "sdk", "npm", "getting started"] },
  { id: "authentication", label: "Authentication", icon: Key, keywords: ["auth", "bearer", "token", "api key", "authorization", "secret", "credentials"] },
  { id: "verify-identity", label: "Verify Identity", icon: ShieldCheck, keywords: ["kyc", "document", "passport", "national id", "verify", "identity", "biometric", "aml", "sanctions"] },
  { id: "trust-score", label: "Trust Score", icon: Shield, keywords: ["trust", "score", "risk", "behavioral", "device reputation", "breakdown"] },
  { id: "identity-graph", label: "Identity Graph", icon: Globe, keywords: ["graph", "query", "fraud ring", "device", "fingerprint", "connections", "linked accounts"] },
  { id: "face-match", label: "Face Match", icon: Search, keywords: ["face", "liveness", "deepfake", "biometric", "similarity", "capture", "photo"] },
  { id: "webhooks", label: "Webhooks", icon: Code2, keywords: ["webhook", "event", "notification", "callback", "verification.completed", "fraud.alert"] },
  { id: "sdks", label: "SDKs & Libraries", icon: Book, keywords: ["sdk", "node", "python", "go", "ruby", "java", "library", "install", "package"] },
];

const CodeBlock = ({ code, language = "bash" }: { code: string; language?: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group rounded-xl overflow-hidden border border-border bg-secondary/30">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 text-xs font-mono text-muted-foreground">
        <span>{language}</span>
        <button onClick={handleCopy} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-secondary">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <pre className="p-4 text-sm font-mono leading-relaxed overflow-x-auto text-foreground/90">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const ParamTable = ({ params }: { params: { name: string; type: string; required: boolean; desc: string }[] }) => (
  <div className="rounded-xl border border-border overflow-hidden">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-secondary/30">
          <th className="text-left px-4 py-2.5 font-medium text-foreground">Parameter</th>
          <th className="text-left px-4 py-2.5 font-medium text-foreground">Type</th>
          <th className="text-left px-4 py-2.5 font-medium text-foreground hidden sm:table-cell">Required</th>
          <th className="text-left px-4 py-2.5 font-medium text-foreground">Description</th>
        </tr>
      </thead>
      <tbody>
        {params.map((p) => (
          <tr key={p.name} className="border-b border-border/50 last:border-0">
            <td className="px-4 py-2.5 font-mono text-primary text-xs">{p.name}</td>
            <td className="px-4 py-2.5 font-mono text-muted-foreground text-xs">{p.type}</td>
            <td className="px-4 py-2.5 hidden sm:table-cell">
              {p.required ? (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">required</span>
              ) : (
                <span className="text-xs text-muted-foreground">optional</span>
              )}
            </td>
            <td className="px-4 py-2.5 text-muted-foreground">{p.desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const MethodBadge = ({ method }: { method: string }) => {
  const colors: Record<string, string> = {
    GET: "bg-emerald-500/10 text-emerald-500",
    POST: "bg-primary/10 text-primary",
    PUT: "bg-amber-500/10 text-amber-500",
    DELETE: "bg-destructive/10 text-destructive",
  };
  return <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${colors[method] || ""}`}>{method}</span>;
};

const Docs = () => {
  const [activeSection, setActiveSection] = useState("getting-started");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sidebarSections;
    const q = searchQuery.toLowerCase();
    return sidebarSections.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.id.includes(q) ||
        s.keywords.some((k) => k.includes(q))
    );
  }, [searchQuery]);

  const visibleIds = useMemo(() => new Set(filteredSections.map((s) => s.id)), [filteredSections]);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <span className="font-display font-bold text-lg">TrustLayer</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-medium">Documentation</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/"><ArrowLeft className="w-4 h-4 mr-1" /> Home</Link>
            </Button>
            <Button variant="hero" size="sm" asChild>
              <Link to="/auth">Get API Key</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 fixed top-16 bottom-0 border-r border-border overflow-y-auto p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-sm bg-secondary/30 border-border"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <nav className="space-y-1">
            {filteredSections.length === 0 && (
              <p className="text-xs text-muted-foreground px-3 py-2">No matching sections</p>
            )}
            {filteredSections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                  activeSection === s.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <s.icon className="w-4 h-4 shrink-0" />
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-64 px-4 sm:px-8 py-10 max-w-4xl">
          {/* Mobile search */}
          <div className="lg:hidden relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-10 text-sm bg-secondary/30 border-border"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {searchQuery && filteredSections.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <Search className="w-10 h-10 mx-auto mb-4 opacity-40" />
              <p className="text-lg font-medium">No results for "{searchQuery}"</p>
              <p className="text-sm mt-1">Try searching for "kyc", "webhook", or "sdk"</p>
            </div>
          )}
          {/* Getting Started */}
          {visibleIds.has("getting-started") && <section id="getting-started" className="mb-20">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                TrustLayer <span className="text-gradient-primary">API Reference</span>
              </h1>
              <p className="text-muted-foreground text-lg mb-8 max-w-2xl">
                Everything you need to integrate identity verification, trust scoring, and fraud detection into your application.
              </p>

              <div className="glass rounded-2xl p-6 border border-border mb-8">
                <h3 className="font-semibold mb-2">Base URL</h3>
                <CodeBlock code="https://api.trustlayer.io/v1" />
              </div>

              <h3 className="text-xl font-semibold mb-4">Quick Start</h3>
              <p className="text-muted-foreground mb-4">Install the SDK for your preferred language and make your first verification in under 5 minutes.</p>

              <div className="space-y-4">
                <CodeBlock language="bash" code={`npm install @trustlayer/node`} />
                <CodeBlock language="javascript" code={`import TrustLayer from '@trustlayer/node';

const tl = new TrustLayer({ apiKey: 'sk_live_...' });

const result = await tl.verify.identity({
  document: { type: 'national_id', country: 'KE', number: '32456789' },
  checks: ['document', 'aml', 'sanctions'],
});

console.log(result.trust_score); // 923`} />
              </div>
            </motion.div>
          </section>}

          {/* Authentication */}
          {visibleIds.has("authentication") && <section id="authentication" className="mb-20">
            <h2 className="text-2xl font-display font-bold mb-4">Authentication</h2>
            <p className="text-muted-foreground mb-6">
              Authenticate requests using a Bearer token in the <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs font-mono">Authorization</code> header.
            </p>
            <CodeBlock language="bash" code={`curl https://api.trustlayer.io/v1/trust-score/usr_123 \\
  -H "Authorization: Bearer sk_live_your_key_here" \\
  -H "Content-Type: application/json"`} />
            <div className="mt-6 glass rounded-xl p-5 border border-border">
              <h4 className="font-semibold mb-2 text-sm">Key Types</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><code className="text-primary font-mono text-xs">sk_live_*</code> — Production keys with full access</li>
                <li><code className="text-primary font-mono text-xs">sk_test_*</code> — Sandbox keys (no real verifications)</li>
                <li><code className="text-primary font-mono text-xs">pk_live_*</code> — Publishable keys for client-side SDKs</li>
              </ul>
            </div>
          </section>}

          {/* Verify Identity */}
          {visibleIds.has("verify-identity") && <section id="verify-identity" className="mb-20">
            <div className="flex items-center gap-3 mb-4">
              <MethodBadge method="POST" />
              <h2 className="text-2xl font-display font-bold">/v1/verify/identity</h2>
            </div>
            <p className="text-muted-foreground mb-6">Run a full KYC verification combining document, biometric, and watchlist checks in a single API call.</p>

            <h4 className="font-semibold mb-3 text-sm">Request Body</h4>
            <ParamTable params={[
              { name: "document", type: "object", required: true, desc: "Document details (type, country, number)" },
              { name: "document.type", type: "string", required: true, desc: "national_id, passport, drivers_license" },
              { name: "document.country", type: "string", required: true, desc: "ISO 3166-1 alpha-2 country code" },
              { name: "biometric", type: "object", required: false, desc: "Face image and liveness options" },
              { name: "checks", type: "string[]", required: true, desc: "Array: document, face_match, aml, sanctions" },
            ]} />

            <h4 className="font-semibold mt-6 mb-3 text-sm">Example</h4>
            <CodeBlock language="javascript" code={`const result = await tl.verify.identity({
  document: {
    type: 'passport',
    country: 'US',
    number: 'P12345678',
  },
  biometric: {
    face_image: base64Image,
    liveness_check: true,
  },
  checks: ['document', 'face_match', 'aml', 'sanctions'],
});
// result.status → "verified" | "pending" | "failed"
// result.trust_score → 0–1000`} />

            <h4 className="font-semibold mt-6 mb-3 text-sm">Response</h4>
            <CodeBlock language="json" code={`{
  "verification_id": "vrf_8842xK9mP2",
  "status": "verified",
  "trust_score": 923,
  "checks": {
    "document": { "status": "passed", "confidence": 0.98 },
    "face_match": { "status": "passed", "similarity": 0.96 },
    "aml": { "status": "clear" },
    "sanctions": { "status": "clear" }
  },
  "risk_level": "low"
}`} />
          </section>}

          {/* Trust Score */}
          {visibleIds.has("trust-score") && <section id="trust-score" className="mb-20">
            <div className="flex items-center gap-3 mb-4">
              <MethodBadge method="GET" />
              <h2 className="text-2xl font-display font-bold">/v1/trust-score/{"{user_id}"}</h2>
            </div>
            <p className="text-muted-foreground mb-6">Retrieve the real-time composite trust score and breakdown for any verified user.</p>

            <h4 className="font-semibold mb-3 text-sm">Path Parameters</h4>
            <ParamTable params={[
              { name: "user_id", type: "string", required: true, desc: "The unique user identifier (usr_*)" },
            ]} />

            <h4 className="font-semibold mt-6 mb-3 text-sm">Response</h4>
            <CodeBlock language="json" code={`{
  "user_id": "usr_7kQ2mN4xP1",
  "trust_score": 847,
  "breakdown": {
    "identity_signals": 312,
    "behavioral": 198,
    "device_reputation": 187,
    "graph_analysis": 150
  },
  "risk_flags": [],
  "score_trend": "stable"
}`} />
          </section>}

          {/* Identity Graph */}
          {visibleIds.has("identity-graph") && <section id="identity-graph" className="mb-20">
            <div className="flex items-center gap-3 mb-4">
              <MethodBadge method="POST" />
              <h2 className="text-2xl font-display font-bold">/v1/graph/query</h2>
            </div>
            <p className="text-muted-foreground mb-6">Query the identity graph to detect fraud rings, linked accounts, and suspicious device clusters.</p>

            <h4 className="font-semibold mb-3 text-sm">Request Body</h4>
            <ParamTable params={[
              { name: "entity", type: "object", required: true, desc: "Entity to query (type + identifier)" },
              { name: "depth", type: "number", required: false, desc: "Traversal depth (1–5, default 2)" },
              { name: "include", type: "string[]", required: false, desc: "Filter: users, devices, fraud_signals" },
              { name: "time_range", type: "string", required: false, desc: "Lookback window: 7d, 30d, 90d" },
            ]} />

            <h4 className="font-semibold mt-6 mb-3 text-sm">Example</h4>
            <CodeBlock language="python" code={`import trustlayer

tl = trustlayer.Client(api_key="sk_live_...")

result = tl.graph.query(
    entity={"type": "device", "fingerprint": "fp_9xM2kL4nQ7"},
    depth=2,
    include=["users", "devices", "fraud_signals"],
    time_range="30d",
)

print(f"Connections: {result.connections}")
print(f"Fraud probability: {result.fraud_probability}")`} />
          </section>}

          {/* Face Match */}
          {visibleIds.has("face-match") && <section id="face-match" className="mb-20">
            <div className="flex items-center gap-3 mb-4">
              <MethodBadge method="POST" />
              <h2 className="text-2xl font-display font-bold">/v1/verify/face</h2>
            </div>
            <p className="text-muted-foreground mb-6">Compare a live capture against a reference image with deepfake detection and liveness verification.</p>

            <h4 className="font-semibold mb-3 text-sm">Request Body</h4>
            <ParamTable params={[
              { name: "reference_image", type: "string", required: true, desc: "Base64-encoded reference photo" },
              { name: "live_capture", type: "string", required: true, desc: "Base64-encoded live capture" },
              { name: "options.liveness_mode", type: "string", required: false, desc: "active or passive (default: active)" },
              { name: "options.deepfake_detection", type: "boolean", required: false, desc: "Enable deepfake analysis" },
            ]} />

            <h4 className="font-semibold mt-6 mb-3 text-sm">Response</h4>
            <CodeBlock language="json" code={`{
  "face_match": { "is_match": true, "similarity": 0.97 },
  "liveness": { "is_live": true, "score": 0.99 },
  "deepfake": { "detected": false, "confidence": 0.01 },
  "processing_time_ms": 342
}`} />
          </section>}

          {/* Webhooks */}
          {visibleIds.has("webhooks") && <section id="webhooks" className="mb-20">
            <h2 className="text-2xl font-display font-bold mb-4">Webhooks</h2>
            <p className="text-muted-foreground mb-6">
              Receive real-time notifications when verification statuses change or risk flags are triggered.
            </p>

            <h4 className="font-semibold mb-3 text-sm">Supported Events</h4>
            <div className="glass rounded-xl border border-border divide-y divide-border/50">
              {[
                { event: "verification.completed", desc: "A verification finished processing" },
                { event: "trust_score.changed", desc: "A user's trust score changed significantly" },
                { event: "fraud.alert", desc: "Suspicious activity detected in the identity graph" },
                { event: "document.expired", desc: "A verified document has expired" },
              ].map((w) => (
                <div key={w.event} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                  <code className="text-xs font-mono text-primary shrink-0">{w.event}</code>
                  <span className="text-sm text-muted-foreground">{w.desc}</span>
                </div>
              ))}
            </div>

            <h4 className="font-semibold mt-6 mb-3 text-sm">Webhook Payload Example</h4>
            <CodeBlock language="json" code={`{
  "event": "verification.completed",
  "data": {
    "verification_id": "vrf_8842xK9mP2",
    "status": "verified",
    "trust_score": 923,
    "user_id": "usr_7kQ2mN4xP1"
  },
  "created_at": "2026-03-30T14:22:11Z"
}`} />
          </section>}

          {/* SDKs */}
          {visibleIds.has("sdks") && <section id="sdks" className="mb-20">
            <h2 className="text-2xl font-display font-bold mb-4">SDKs & Libraries</h2>
            <p className="text-muted-foreground mb-6">Official SDKs with full TypeScript/type support.</p>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { lang: "Node.js / TypeScript", pkg: "npm install @trustlayer/node", color: "text-emerald-500" },
                { lang: "Python", pkg: "pip install trustlayer", color: "text-blue-500" },
                { lang: "Go", pkg: "go get github.com/trustlayer/go-sdk", color: "text-cyan-500" },
                { lang: "Ruby", pkg: "gem install trustlayer", color: "text-red-500" },
                { lang: "Java", pkg: "com.trustlayer:sdk:1.0.0", color: "text-amber-500" },
                { lang: "cURL", pkg: "No installation needed", color: "text-muted-foreground" },
              ].map((sdk) => (
                <div key={sdk.lang} className="glass rounded-xl border border-border p-4">
                  <h4 className={`font-semibold text-sm mb-1 ${sdk.color}`}>{sdk.lang}</h4>
                  <code className="text-xs font-mono text-muted-foreground">{sdk.pkg}</code>
                </div>
              ))}
            </div>
          </section>}

          {/* Rate Limits */}
          <div className="glass rounded-2xl p-6 border border-border">
            <h3 className="font-semibold mb-3">Rate Limits</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between"><span>Free tier</span><span className="font-mono text-foreground">100 req/min</span></div>
              <div className="flex justify-between"><span>Growth</span><span className="font-mono text-foreground">1,000 req/min</span></div>
              <div className="flex justify-between"><span>Enterprise</span><span className="font-mono text-foreground">Unlimited</span></div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Docs;
