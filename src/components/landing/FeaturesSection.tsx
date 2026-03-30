import { motion } from "framer-motion";
import {
  Fingerprint,
  Globe,
  Brain,
  Smartphone,
  ShieldCheck,
  Lock,
  Scale,
  Wallet,
} from "lucide-react";

const features = [
  {
    icon: Fingerprint,
    title: "Biometric Ingestion",
    description: "Face match, liveness detection, voice biometrics, NFC chip reading, and deepfake defense.",
    color: "text-primary",
    bgColor: "bg-primary/10",
    inspired: "Daon + Incode + Mitek",
  },
  {
    icon: Globe,
    title: "Global Data Verification",
    description: "Government databases, telco verification, bank validation, and credit bureau checks across 195+ countries.",
    color: "text-violet-glow",
    bgColor: "bg-accent/10",
    inspired: "Trulioo + Signicat",
  },
  {
    icon: Brain,
    title: "Identity Graph Engine",
    description: "20,000+ signals analyzed through AI. Email, phone, device, behavior — all mapped as relationships.",
    color: "text-amber-glow",
    bgColor: "bg-amber-glow/10",
    inspired: "Socure",
  },
  {
    icon: Smartphone,
    title: "Device & Behavioral Intel",
    description: "Device fingerprinting, keystroke dynamics, GPS/IP anomaly detection, and emulator blocking.",
    color: "text-emerald-glow",
    bgColor: "bg-emerald-glow/10",
    inspired: "Advanced Fraud Systems",
  },
  {
    icon: ShieldCheck,
    title: "Continuous Authentication",
    description: "Risk-based authentication that adapts in real-time. Low risk → silent. High risk → biometric re-check.",
    color: "text-primary",
    bgColor: "bg-primary/10",
    inspired: "Okta + Entrust",
  },
  {
    icon: Lock,
    title: "Zero-Knowledge Privacy",
    description: "Biometric data never stored raw. Hashing, encryption, and zero-knowledge proofs protect user identity.",
    color: "text-rose-glow",
    bgColor: "bg-rose-glow/10",
    inspired: "Modern Cryptography",
  },
  {
    icon: Scale,
    title: "Compliance Engine",
    description: "Built-in KYC, AML, KYB checks. FATF, GDPR, and local regulatory compliance automated.",
    color: "text-violet-glow",
    bgColor: "bg-accent/10",
    inspired: "Fourthline",
  },
  {
    icon: Wallet,
    title: "Identity Wallet",
    description: "Users hold verified credentials. Reusable identity means no repeated onboarding — ever.",
    color: "text-emerald-glow",
    bgColor: "bg-emerald-glow/10",
    inspired: "eID Systems",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-32 relative">
      <div className="absolute inset-0 bg-gradient-surface" />
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="text-xs font-mono text-primary uppercase tracking-widest">8 Verification Layers</span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mt-4 mb-6">
            Every Layer of <span className="text-gradient-primary">Identity</span>, Unified
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Inspired by the world's top 10 identity systems — Daon, Okta, Socure, Trulioo, and more — 
            merged into one unstoppable platform.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group glass rounded-xl p-6 hover:shadow-glow-sm transition-all duration-500 hover:-translate-y-1"
            >
              <div className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{feature.description}</p>
              <span className="text-xs font-mono text-primary/60">← {feature.inspired}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
