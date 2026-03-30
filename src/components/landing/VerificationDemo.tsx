import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Camera,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Scan,
  ArrowRight,
  RotateCcw,
  Fingerprint,
  FileText,
  User,
  Globe,
  Brain,
  Smartphone,
} from "lucide-react";
import TrustScoreRing from "./TrustScoreRing";

type Step = "idle" | "upload" | "scanning-id" | "face-capture" | "scanning-face" | "calculating" | "result";

interface SignalResult {
  label: string;
  icon: React.ElementType;
  score: number;
  maxScore: number;
  status: "pass" | "warn" | "fail";
  detail: string;
}

const VerificationDemo = () => {
  const [step, setStep] = useState<Step>("idle");
  const [progress, setProgress] = useState(0);
  const [trustScore, setTrustScore] = useState(0);
  const [signals, setSignals] = useState<SignalResult[]>([]);
  const [scanLine, setScanLine] = useState(0);

  const resetDemo = useCallback(() => {
    setStep("idle");
    setProgress(0);
    setTrustScore(0);
    setSignals([]);
    setScanLine(0);
  }, []);

  // Scan line animation
  useEffect(() => {
    if (step !== "scanning-id" && step !== "scanning-face") return;
    const interval = setInterval(() => {
      setScanLine((prev) => (prev >= 100 ? 0 : prev + 2));
    }, 30);
    return () => clearInterval(interval);
  }, [step]);

  // Step progression
  useEffect(() => {
    if (step === "scanning-id") {
      const timer = setTimeout(() => setStep("face-capture"), 2500);
      return () => clearTimeout(timer);
    }
    if (step === "scanning-face") {
      const timer = setTimeout(() => setStep("calculating"), 2800);
      return () => clearTimeout(timer);
    }
    if (step === "calculating") {
      // Simulate signal calculations
      const finalSignals: SignalResult[] = [
        { label: "Document Authenticity", icon: FileText, score: 98, maxScore: 100, status: "pass", detail: "National ID verified via OCR + hologram check" },
        { label: "Face Match", icon: User, score: 96, maxScore: 100, status: "pass", detail: "96% similarity between ID photo and live capture" },
        { label: "Liveness Detection", icon: Camera, score: 99, maxScore: 100, status: "pass", detail: "Active 3D liveness confirmed, no deepfake detected" },
        { label: "Device Reputation", icon: Smartphone, score: 82, maxScore: 100, status: "pass", detail: "Known device, no emulator or VPN detected" },
        { label: "Global Watchlists", icon: Globe, score: 100, maxScore: 100, status: "pass", detail: "AML, sanctions, PEP checks — all clear" },
        { label: "Identity Graph", icon: Brain, score: 78, maxScore: 100, status: "warn", detail: "Thin identity file — limited digital history" },
      ];

      let currentSignal = 0;
      const signalInterval = setInterval(() => {
        if (currentSignal < finalSignals.length) {
          setSignals((prev) => [...prev, finalSignals[currentSignal]]);
          setProgress(Math.round(((currentSignal + 1) / finalSignals.length) * 100));
          currentSignal++;
        } else {
          clearInterval(signalInterval);
          // Calculate final score
          const total = finalSignals.reduce((sum, s) => sum + s.score, 0);
          const maxTotal = finalSignals.reduce((sum, s) => sum + s.maxScore, 0);
          const finalScore = Math.round((total / maxTotal) * 1000);
          setTrustScore(finalScore);
          setTimeout(() => setStep("result"), 600);
        }
      }, 500);

      return () => clearInterval(signalInterval);
    }
  }, [step]);

  const handleUpload = () => {
    setStep("upload");
    setTimeout(() => setStep("scanning-id"), 800);
  };

  const handleFaceCapture = () => {
    setStep("scanning-face");
  };

  return (
    <section id="demo" className="py-32 relative">
      <div className="absolute inset-0 bg-gradient-surface" />
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-xs font-mono text-primary uppercase tracking-widest">Live Demo</span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mt-4 mb-6">
            Experience <span className="text-gradient-primary">Verification</span> in Real-Time
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            Walk through a full identity verification — from document upload to trust score — in seconds.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mb-10">
            {[
              { key: "upload", label: "Upload ID", steps: ["upload", "scanning-id"] },
              { key: "face", label: "Face Scan", steps: ["face-capture", "scanning-face"] },
              { key: "score", label: "Trust Score", steps: ["calculating", "result"] },
            ].map((s, i, arr) => {
              const isActive = s.steps.includes(step) || 
                (step === "result" && i <= 2) ||
                (step === "calculating" && i <= 2) ||
                (step === "face-capture" && i <= 1) ||
                (step === "scanning-face" && i <= 1) ||
                (step === "scanning-id" && i === 0);
              const isDone = (i === 0 && ["face-capture", "scanning-face", "calculating", "result"].includes(step)) ||
                (i === 1 && ["calculating", "result"].includes(step)) ||
                (i === 2 && step === "result");

              return (
                <div key={s.key} className="flex items-center gap-2">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-500 ${
                    isDone
                      ? "bg-emerald-glow/10 text-emerald-glow border border-emerald-glow/30"
                      : isActive
                      ? "bg-primary/10 text-primary border border-glow"
                      : "glass text-muted-foreground"
                  }`}>
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs">
                        {i + 1}
                      </span>
                    )}
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className={`w-8 h-px transition-colors duration-500 ${isDone ? "bg-emerald-glow/50" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Main demo area */}
          <div className="glass rounded-2xl overflow-hidden border border-border min-h-[460px]">
            <AnimatePresence mode="wait">
              {/* IDLE STATE */}
              {step === "idle" && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-12 flex flex-col items-center justify-center text-center min-h-[460px]"
                >
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                    <ShieldCheck className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-foreground mb-3">
                    Start Identity Verification
                  </h3>
                  <p className="text-muted-foreground mb-8 max-w-md">
                    This demo simulates a full KYC verification flow with document scanning, 
                    biometric face match, and real-time trust score calculation.
                  </p>
                  <Button variant="hero" size="lg" className="gap-2" onClick={handleUpload}>
                    <Upload className="w-4 h-4" /> Upload Sample ID
                  </Button>
                  <p className="text-xs text-muted-foreground mt-4 font-mono">
                    No real data is collected — this is a sandbox demo
                  </p>
                </motion.div>
              )}

              {/* UPLOAD + SCANNING ID */}
              {(step === "upload" || step === "scanning-id") && (
                <motion.div
                  key="scan-id"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-8 min-h-[460px] flex flex-col items-center justify-center"
                >
                  <div className="relative w-full max-w-sm aspect-[1.6/1] rounded-xl border-2 border-dashed border-glow bg-primary/5 overflow-hidden mb-8">
                    {/* Fake ID card */}
                    <div className="absolute inset-4 flex flex-col justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                          <User className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="h-2.5 w-24 bg-secondary rounded-full" />
                          <div className="h-2 w-16 bg-secondary/60 rounded-full mt-1.5" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-2 w-32 bg-secondary/60 rounded-full" />
                        <div className="h-2 w-24 bg-secondary/40 rounded-full" />
                        <div className="h-2 w-28 bg-secondary/40 rounded-full" />
                      </div>
                    </div>

                    {/* Scan line */}
                    {step === "scanning-id" && (
                      <motion.div
                        className="absolute left-0 right-0 h-0.5 bg-primary shadow-glow-sm"
                        style={{ top: `${scanLine}%` }}
                      />
                    )}

                    {/* Corner markers */}
                    {[
                      "top-2 left-2 border-t-2 border-l-2",
                      "top-2 right-2 border-t-2 border-r-2",
                      "bottom-2 left-2 border-b-2 border-l-2",
                      "bottom-2 right-2 border-b-2 border-r-2",
                    ].map((pos) => (
                      <div key={pos} className={`absolute w-5 h-5 border-primary ${pos}`} />
                    ))}
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Scan className="w-5 h-5 text-primary animate-pulse-glow" />
                      <h3 className="font-display font-semibold text-foreground">
                        {step === "upload" ? "Uploading Document..." : "Scanning Document..."}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">
                      {step === "scanning-id"
                        ? "OCR extraction • Hologram detection • Tamper analysis"
                        : "Preparing document for verification..."}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* FACE CAPTURE */}
              {step === "face-capture" && (
                <motion.div
                  key="face-capture"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-8 min-h-[460px] flex flex-col items-center justify-center"
                >
                  <div className="relative w-56 h-56 rounded-full border-2 border-dashed border-glow bg-primary/5 flex items-center justify-center mb-8">
                    <div className="w-40 h-40 rounded-full bg-secondary/50 flex items-center justify-center">
                      <User className="w-16 h-16 text-muted-foreground/50" />
                    </div>
                    {/* Pulsing ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" style={{ animationDuration: "2s" }} />

                    {/* Face guide markers */}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 border-t-2 border-primary" />
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 border-b-2 border-primary" />
                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-3 h-3 border-l-2 border-primary" />
                    <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-3 h-3 border-r-2 border-primary" />
                  </div>

                  <h3 className="font-display font-semibold text-foreground mb-2">Position Your Face</h3>
                  <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                    Align your face within the circle. Active liveness detection will verify you're a real person.
                  </p>
                  <Button variant="hero" size="lg" className="gap-2" onClick={handleFaceCapture}>
                    <Camera className="w-4 h-4" /> Capture Face
                  </Button>
                </motion.div>
              )}

              {/* SCANNING FACE */}
              {step === "scanning-face" && (
                <motion.div
                  key="scanning-face"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-8 min-h-[460px] flex flex-col items-center justify-center"
                >
                  <div className="relative w-56 h-56 rounded-full border-2 border-primary bg-primary/5 overflow-hidden flex items-center justify-center mb-8">
                    <div className="w-40 h-40 rounded-full bg-secondary/50 flex items-center justify-center">
                      <User className="w-16 h-16 text-muted-foreground/50" />
                    </div>
                    {/* Vertical scan */}
                    <motion.div
                      className="absolute left-0 right-0 h-1 bg-primary/60 blur-[2px]"
                      style={{ top: `${scanLine}%` }}
                    />
                    {/* Overlay grid */}
                    <div className="absolute inset-0 grid-bg opacity-40 rounded-full" />
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Fingerprint className="w-5 h-5 text-primary animate-pulse-glow" />
                      <h3 className="font-display font-semibold text-foreground">Analyzing Biometrics...</h3>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">
                      Face matching • Liveness check • Deepfake detection
                    </p>
                  </div>
                </motion.div>
              )}

              {/* CALCULATING TRUST SCORE */}
              {step === "calculating" && (
                <motion.div
                  key="calculating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-8 min-h-[460px]"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-display font-semibold text-foreground">Calculating Trust Score</h3>
                      <p className="text-sm text-muted-foreground">Analyzing {signals.length}/6 signal layers...</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-display font-bold text-primary">{progress}%</div>
                      <div className="text-xs text-muted-foreground font-mono">Complete</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-secondary rounded-full mb-8 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-primary rounded-full"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>

                  {/* Signal results */}
                  <div className="space-y-3">
                    <AnimatePresence>
                      {signals.map((signal, i) => (
                        <motion.div
                          key={signal.label}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3 }}
                          className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 border border-border/50"
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            signal.status === "pass" ? "bg-emerald-glow/10" : "bg-amber-glow/10"
                          }`}>
                            <signal.icon className={`w-5 h-5 ${
                              signal.status === "pass" ? "text-emerald-glow" : "text-amber-glow"
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-semibold text-foreground">{signal.label}</span>
                              <span className={`text-sm font-mono font-bold ${
                                signal.status === "pass" ? "text-emerald-glow" : "text-amber-glow"
                              }`}>
                                {signal.score}/{signal.maxScore}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{signal.detail}</p>
                          </div>
                          <div className={`shrink-0 ${
                            signal.status === "pass" ? "text-emerald-glow" : "text-amber-glow"
                          }`}>
                            {signal.status === "pass" ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : (
                              <AlertTriangle className="w-5 h-5" />
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {/* RESULT */}
              {step === "result" && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-8 min-h-[460px]"
                >
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Left: Trust Score */}
                    <div className="flex flex-col items-center justify-center">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, type: "spring" }}
                      >
                        <TrustScoreRing score={trustScore} size={220} />
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="mt-4 text-center"
                      >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-glow/10 border border-emerald-glow/30">
                          <CheckCircle2 className="w-4 h-4 text-emerald-glow" />
                          <span className="text-sm font-semibold text-emerald-glow">Identity Verified</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-3 font-mono">
                          Verification ID: VRF-{Math.random().toString(36).slice(2, 8).toUpperCase()}
                        </p>
                      </motion.div>
                    </div>

                    {/* Right: Signal breakdown */}
                    <div>
                      <h3 className="font-display font-semibold text-foreground mb-4">Signal Breakdown</h3>
                      <div className="space-y-3">
                        {signals.map((signal, i) => (
                          <motion.div
                            key={signal.label}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="flex items-center gap-3"
                          >
                            <signal.icon className={`w-4 h-4 shrink-0 ${
                              signal.status === "pass" ? "text-emerald-glow" : "text-amber-glow"
                            }`} />
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-foreground">{signal.label}</span>
                                <span className="font-mono text-muted-foreground">{signal.score}%</span>
                              </div>
                              <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                                <motion.div
                                  className={`h-full rounded-full ${
                                    signal.status === "pass" ? "bg-emerald-glow" : "bg-amber-glow"
                                  }`}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${signal.score}%` }}
                                  transition={{ duration: 0.6, delay: i * 0.08 }}
                                />
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="mt-6"
                      >
                        <Button variant="hero-outline" size="sm" className="gap-2 w-full" onClick={resetDemo}>
                          <RotateCcw className="w-3 h-3" /> Run Again
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default VerificationDemo;
