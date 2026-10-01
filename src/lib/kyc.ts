// Shared helpers for KYC onboarding pages
export const generateToken = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "vrf_";
  for (let i = 0; i < 32; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
};

export const generateSecret = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "whsec_";
  for (let i = 0; i < 40; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
};

export const statusColor = (s: string) => {
  switch (s) {
    case "verified":
      return "bg-emerald-glow/10 text-emerald-glow";
    case "flagged":
      return "bg-amber-glow/10 text-amber-glow";
    case "rejected":
    case "expired":
      return "bg-rose-glow/10 text-rose-glow";
    case "in_progress":
      return "bg-primary/10 text-primary";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const scoreColor = (score: number | null | undefined) => {
  if (score == null) return "text-muted-foreground";
  if (score >= 700) return "text-emerald-glow";
  if (score >= 350) return "text-amber-glow";
  return "text-rose-glow";
};

// --- Device fingerprinting (identity graph signal) ---

const fnv1a = (str: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
};

const canvasHash = () => {
  try {
    const c = document.createElement("canvas");
    c.width = 200;
    c.height = 40;
    const ctx = c.getContext("2d");
    if (!ctx) return "nocanvas";
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(10, 10, 80, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("TrustLayer🌍", 12, 14);
    return fnv1a(c.toDataURL());
  } catch {
    return "nocanvas";
  }
};

/** Stable, privacy-safe device fingerprint hash (no raw PII stored). */
export const getDeviceFingerprint = () => {
  const raw = [
    navigator.userAgent,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    navigator.hardwareConcurrency ?? "?",
    (navigator as any).deviceMemory ?? "?",
    navigator.maxTouchPoints ?? 0,
    canvasHash(),
  ].join("|");
  return `dev_${fnv1a(raw)}${fnv1a(raw.split("").reverse().join(""))}`;
};

/** Short human label for a fingerprint, e.g. "Chrome · macOS · dev_a1b2" */
export const describeDevice = () => {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Safari\//.test(ua) && !/Chrome/.test(ua)
        ? "Safari"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "OS";
  return `${browser} · ${os}`;
};

// --- Liveness challenges ---

export const LIVENESS_CHALLENGES = [
  { id: "turn_left", label: "Turn your head slightly to the LEFT", icon: "↩️" },
  { id: "turn_right", label: "Turn your head slightly to the RIGHT", icon: "↪️" },
  { id: "smile", label: "Smile naturally at the camera", icon: "😊" },
  { id: "look_up", label: "Look slightly UP, then back at the camera", icon: "👀" },
] as const;

export const randomChallenge = () =>
  LIVENESS_CHALLENGES[Math.floor(Math.random() * LIVENESS_CHALLENGES.length)];
