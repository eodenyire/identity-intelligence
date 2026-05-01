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
