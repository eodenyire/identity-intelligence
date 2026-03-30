import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Fingerprint, Eye } from "lucide-react";
import TrustScoreRing from "./TrustScoreRing";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 grid-bg opacity-30" />
      
      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px]" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-glow bg-primary/5 mb-8">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
              <span className="text-xs font-mono text-primary tracking-wider uppercase">
                Identity Intelligence Platform
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-display font-bold leading-[1.05] mb-6">
              The World's Most
              <br />
              <span className="text-gradient-primary">Advanced</span>
              <br />
              Identity Layer
            </h1>

            <p className="text-lg text-muted-foreground max-w-lg mb-10 leading-relaxed">
              Multi-modal biometrics, real-time fraud intelligence, and continuous 
              trust scoring — unified in one API. Built for the scale of Africa, 
              ready for the world.
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <Button variant="hero" size="lg" className="gap-2">
                Start Building <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="hero-outline" size="lg">
                View Documentation
              </Button>
            </div>

            {/* Stats */}
            <div className="flex gap-10">
              {[
                { value: "195+", label: "Countries" },
                { value: "20K+", label: "Signals" },
                { value: "99.7%", label: "Accuracy" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl font-display font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="hidden lg:flex items-center justify-center"
          >
            <div className="relative">
              <TrustScoreRing score={847} />
              
              {/* Floating icons */}
              {[
                { Icon: Shield, delay: 0, x: -120, y: -80, color: "text-primary" },
                { Icon: Fingerprint, delay: 0.5, x: 120, y: -60, color: "text-accent" },
                { Icon: Eye, delay: 1, x: 100, y: 80, color: "text-emerald-glow" },
              ].map(({ Icon, delay, x, y, color }, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, y: [0, -8, 0] }}
                  transition={{
                    opacity: { delay: delay + 0.5 },
                    y: { duration: 3, repeat: Infinity, delay },
                  }}
                  className="absolute"
                  style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
                >
                  <div className="glass p-3 rounded-xl shadow-glow-sm">
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
