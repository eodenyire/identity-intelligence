import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Camera,
  Upload,
  CheckCircle2,
  XCircle,
  Loader2,
  IdCard,
  User,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

interface PublicSession {
  id: string;
  customer_name: string;
  id_type: string;
  country: string | null;
  status: string;
  expires_at: string;
}

type Step = "intro" | "id_front" | "id_back" | "selfie" | "submitting" | "done";

const Verify = () => {
  const { token } = useParams();
  const { toast } = useToast();
  const [session, setSession] = useState<PublicSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("intro");
  const [files, setFiles] = useState<Record<string, File | null>>({
    id_front: null,
    id_back: null,
    selfie: null,
  });
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ status: string; trust_score: number; analysis: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [retrying, setRetrying] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const retryTimerRef = useRef<number | null>(null);

  const loadSession = async (opts: { silent?: boolean } = {}) => {
    if (!token) return;
    if (!opts.silent) setRetrying(true);
    const { data, error } = await supabase.functions.invoke("get-verification-session", {
      body: { token },
    });
    const payload = data as any;
    if (error || !payload || payload.error) {
      const msg = payload?.error ?? "This verification link is invalid or has expired.";
      if (/expired/i.test(msg)) setExpired(true);
      setError(msg);
    } else {
      // Successfully fetched — clear any prior expired/error state if still valid
      const stillValid = new Date(payload.expires_at) > new Date();
      setSession(payload as PublicSession);
      if (stillValid) {
        setExpired(false);
        setError(null);
      } else {
        setExpired(true);
      }
    }
    setLoading(false);
    setRetrying(false);
  };

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Auto-retry with exponential backoff while expired/errored (caps at 5 attempts, 60s)
  useEffect(() => {
    if (!expired && !error) {
      setRetryAttempt(0);
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      return;
    }
    if (retryAttempt >= 5) return;
    const delay = Math.min(60000, 2000 * Math.pow(2, retryAttempt));
    retryTimerRef.current = window.setTimeout(async () => {
      setRetryAttempt((a) => a + 1);
      await loadSession({ silent: true });
    }, delay);
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired, error, retryAttempt]);

  // Countdown + auto-expire
  useEffect(() => {
    if (!session) return;
    const tick = () => {
      const ms = new Date(session.expires_at).getTime() - Date.now();
      if (ms <= 0) {
        setExpired(true);
        setTimeLeft("00:00");
        return;
      }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setTimeLeft(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session]);

  // Stop camera when expired
  useEffect(() => {
    if (expired && streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, [expired]);

  // Camera lifecycle for selfie step
  useEffect(() => {
    if (step !== "selfie") {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      return;
    }
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
        });
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play();
        }
      } catch (e) {
        toast({
          title: "Camera unavailable",
          description: "Please allow camera access or upload a selfie below.",
          variant: "destructive",
        });
      }
    })();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [step, toast]);

  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    c.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: "image/jpeg" });
      onFile("selfie", file);
    }, "image/jpeg", 0.9);
  };

  const onFile = (key: string, file: File | null) => {
    setFiles((p) => ({ ...p, [key]: file }));
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviews((p) => ({ ...p, [key]: url }));
    } else {
      setPreviews((p) => {
        const n = { ...p };
        delete n[key];
        return n;
      });
    }
  };

  const submit = async () => {
    if (!session || !files.id_front || !files.selfie) return;
    if (expired) {
      toast({
        title: "Link expired",
        description: "This verification link is no longer valid.",
        variant: "destructive",
      });
      return;
    }
    setStep("submitting");
    try {
      const uploaded: Array<{ doc_type: string; mime_type: string; inline_b64: string }> = [];
      for (const [k, f] of Object.entries(files)) {
        if (!f) continue;
        const buf = await f.arrayBuffer();
        const bytes = new Uint8Array(buf);
        // chunked btoa for large files
        let bin = "";
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        uploaded.push({
          doc_type: k,
          mime_type: f.type || "image/jpeg",
          inline_b64: btoa(bin),
        });
      }

      const { data, error } = await supabase.functions.invoke("verify-identity", {
        body: { token, documents: uploaded },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as any);
      setStep("done");
    } catch (e: any) {
      const msg = e?.message ?? "Please try again.";
      if (/expired/i.test(msg)) setExpired(true);
      toast({
        title: "Verification failed",
        description: msg,
        variant: "destructive",
      });
      setStep("selfie");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass rounded-xl p-8 max-w-md text-center">
          <XCircle className="w-12 h-12 text-rose-glow mx-auto mb-4" />
          <h1 className="text-xl font-display font-bold mb-2">Link unavailable</h1>
          <p className="text-sm text-muted-foreground">
            {error ?? "This verification link is no longer valid."}
          </p>
        </div>
      </div>
    );
  }

  if (session.status === "verified" || session.status === "rejected") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass rounded-xl p-8 max-w-md text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-glow mx-auto mb-4" />
          <h1 className="text-xl font-display font-bold mb-2">Already submitted</h1>
          <p className="text-sm text-muted-foreground">
            Thank you. This verification has already been completed.
          </p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass rounded-xl p-8 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-amber-glow mx-auto mb-4" />
          <h1 className="text-xl font-display font-bold mb-2">Verification link expired</h1>
          <p className="text-sm text-muted-foreground mb-4">
            This verification link is no longer valid. Please contact the requesting institution to receive a new link.
          </p>
          <p className="text-xs font-mono text-muted-foreground">
            EXPIRED {new Date(session.expires_at).toLocaleString()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Brand bar */}
      <div className="border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-display font-bold">
              Trust<span className="text-gradient-primary">Layer</span>
            </span>
          </Link>
          <div className="flex items-center gap-3 text-xs font-mono">
            {timeLeft && (
              <span className="text-muted-foreground">
                EXPIRES IN <span className="text-primary">{timeLeft}</span>
              </span>
            )}
            <span className="text-muted-foreground hidden sm:inline">SECURE VERIFICATION</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12 max-w-2xl">
        <AnimatePresence mode="wait">
          {step === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass rounded-xl p-8 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-display font-bold mb-2">
                Hi {session.customer_name.split(" ")[0]}, let's verify your identity
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                You'll need your <span className="text-foreground font-semibold capitalize">{session.id_type.replace("_", " ")}</span> and a moment in good lighting.
              </p>
              <div className="grid grid-cols-3 gap-3 mb-6 text-xs">
                {[
                  { icon: IdCard, label: "Take a photo of your ID" },
                  { icon: User, label: "Take a quick selfie" },
                  { icon: CheckCircle2, label: "Get instant result" },
                ].map((s, i) => (
                  <div key={i} className="bg-secondary/50 rounded-lg p-3">
                    <s.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <Button variant="hero" size="lg" className="w-full" onClick={() => setStep("id_front")}>
                Get Started <ChevronRight className="w-4 h-4" />
              </Button>
              <p className="text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Your data is encrypted and only shared with the requester.
              </p>
            </motion.div>
          )}

          {(step === "id_front" || step === "id_back") && (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass rounded-xl p-8"
            >
              <div className="flex items-center gap-2 mb-2 text-xs font-mono text-primary">
                STEP {step === "id_front" ? "1" : "2"} / 3
              </div>
              <h2 className="text-2xl font-display font-bold mb-2">
                {step === "id_front" ? "Front of your ID" : "Back of your ID"}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Make sure all corners are visible and text is clearly readable.
              </p>

              <label className="block aspect-[3/2] rounded-xl border-2 border-dashed border-border bg-secondary/30 hover:border-primary/50 transition-colors cursor-pointer overflow-hidden mb-4">
                {previews[step] ? (
                  <img src={previews[step]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Upload className="w-8 h-8" />
                    <p className="text-sm">Tap to upload or take a photo</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => onFile(step, e.target.files?.[0] ?? null)}
                />
              </label>

              <div className="flex gap-2">
                {step === "id_back" && (
                  <Button variant="ghost" size="lg" onClick={() => setStep("id_front")}>
                    Back
                  </Button>
                )}
                <Button
                  variant="hero"
                  size="lg"
                  className="flex-1"
                  disabled={!files[step]}
                  onClick={() => {
                    if (step === "id_front") {
                      // Skip back if passport
                      if (session.id_type === "passport") setStep("selfie");
                      else setStep("id_back");
                    } else setStep("selfie");
                  }}
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === "selfie" && (
            <motion.div
              key="selfie"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass rounded-xl p-8"
            >
              <div className="flex items-center gap-2 mb-2 text-xs font-mono text-primary">STEP 3 / 3</div>
              <h2 className="text-2xl font-display font-bold mb-2">Take a quick selfie</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Look directly at the camera. We'll match it to your ID.
              </p>

              <div className="aspect-square rounded-xl overflow-hidden bg-secondary/30 mb-4 relative">
                {previews.selfie ? (
                  <img src={previews.selfie} alt="" className="w-full h-full object-cover" />
                ) : (
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                )}
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-4 border-2 border-primary/40 rounded-full pointer-events-none" />
              </div>

              <div className="flex gap-2 mb-3">
                <Button variant="ghost" size="lg" onClick={() => setStep(session.id_type === "passport" ? "id_front" : "id_back")}>
                  Back
                </Button>
                {previews.selfie ? (
                  <>
                    <Button variant="hero-outline" size="lg" onClick={() => onFile("selfie", null)}>
                      Retake
                    </Button>
                    <Button variant="hero" size="lg" className="flex-1" onClick={submit}>
                      Submit Verification
                    </Button>
                  </>
                ) : (
                  <Button variant="hero" size="lg" className="flex-1" onClick={captureSelfie}>
                    <Camera className="w-4 h-4" /> Capture
                  </Button>
                )}
              </div>

              <label className="block text-center text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                Or upload a photo instead
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onFile("selfie", e.target.files?.[0] ?? null)}
                />
              </label>
            </motion.div>
          )}

          {step === "submitting" && (
            <motion.div
              key="submitting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass rounded-xl p-12 text-center"
            >
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-display font-bold mb-2">Analyzing your identity</h2>
              <p className="text-sm text-muted-foreground">
                Our AI is checking the document, matching your face, and detecting liveness…
              </p>
            </motion.div>
          )}

          {step === "done" && result && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-xl p-8 text-center"
            >
              {result.status === "verified" ? (
                <>
                  <CheckCircle2 className="w-16 h-16 text-emerald-glow mx-auto mb-4" />
                  <h2 className="text-2xl font-display font-bold mb-2">You're verified!</h2>
                </>
              ) : result.status === "rejected" ? (
                <>
                  <XCircle className="w-16 h-16 text-rose-glow mx-auto mb-4" />
                  <h2 className="text-2xl font-display font-bold mb-2">Verification could not be completed</h2>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-16 h-16 text-amber-glow mx-auto mb-4" />
                  <h2 className="text-2xl font-display font-bold mb-2">Submitted for review</h2>
                </>
              )}
              <p className="text-sm text-muted-foreground mb-6">
                {result.status === "verified"
                  ? "Thanks! You can close this page."
                  : result.status === "rejected"
                  ? "Please contact the requesting institution for next steps."
                  : "A reviewer will check your submission shortly."}
              </p>
              <div className="inline-flex items-center gap-2 bg-secondary/50 rounded-full px-4 py-2">
                <span className="text-xs text-muted-foreground">Trust score</span>
                <span className="text-lg font-display font-bold text-primary">{result.trust_score}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Verify;
