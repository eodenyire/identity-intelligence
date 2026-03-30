import { motion } from "framer-motion";

interface TrustScoreRingProps {
  score: number;
  size?: number;
}

const TrustScoreRing = ({ score, size = 280 }: TrustScoreRingProps) => {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 1000) * circumference;
  const center = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl" />
      
      <svg width={size} height={size} className="relative z-10 -rotate-90">
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="6"
        />
        {/* Score ring */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 2, ease: "easeOut", delay: 0.5 }}
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--cyan-glow))" />
            <stop offset="100%" stopColor="hsl(var(--violet-glow))" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <span className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Trust Score</span>
        <motion.span
          className="text-5xl font-display font-bold text-gradient-primary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-muted-foreground mt-1">/ 1000</span>
      </div>
    </div>
  );
};

export default TrustScoreRing;
