import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "Free",
    sub: "Up to 100 verifications/mo",
    features: [
      "ID Document Verification",
      "Face Match + Liveness",
      "Basic Trust Score",
      "REST API Access",
      "Community Support",
    ],
    cta: "Start Free",
    variant: "hero-outline" as const,
  },
  {
    name: "Growth",
    price: "$0.50",
    sub: "Per verification · Pay as you go",
    features: [
      "Everything in Starter",
      "Full Identity Graph",
      "AML / Sanctions Screening",
      "Device Intelligence",
      "Behavioral Biometrics",
      "Priority Support",
    ],
    cta: "Get API Key",
    variant: "hero" as const,
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    sub: "Unlimited scale · Dedicated infra",
    features: [
      "Everything in Growth",
      "Continuous Authentication",
      "Zero-Knowledge Privacy",
      "Custom Compliance Engine",
      "On-premise Deployment",
      "Dedicated Account Manager",
      "99.99% SLA",
    ],
    cta: "Contact Sales",
    variant: "hero-outline" as const,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-32 relative">
      <div className="absolute inset-0 bg-gradient-surface" />
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="text-xs font-mono text-primary uppercase tracking-widest">Pricing</span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mt-4 mb-6">
            Simple, <span className="text-gradient-primary">Stripe-Style</span> Pricing
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            Pay per verification. No hidden fees. Scale from 100 to 100 million.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`glass rounded-2xl p-8 flex flex-col ${
                plan.featured ? "shadow-glow-md border-glow ring-1 ring-primary/20" : ""
              }`}
            >
              {plan.featured && (
                <span className="text-xs font-mono text-primary uppercase tracking-widest mb-4">Most Popular</span>
              )}
              <h3 className="font-display text-xl font-bold text-foreground">{plan.name}</h3>
              <div className="mt-4 mb-1">
                <span className="text-4xl font-display font-bold text-foreground">{plan.price}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-8">{plan.sub}</p>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button variant={plan.variant} className="w-full">
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
