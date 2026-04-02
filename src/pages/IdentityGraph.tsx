import { motion } from "framer-motion";
import Navbar from "@/components/landing/Navbar";
import IdentityGraph from "@/components/dashboard/IdentityGraph";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldCheck, AlertTriangle, Users, Network } from "lucide-react";

const riskSummary = [
  { icon: Users, label: "Entities Tracked", value: "16", color: "text-primary" },
  { icon: Network, label: "Connections", value: "19", color: "text-violet-glow" },
  { icon: ShieldCheck, label: "Verified", value: "2", color: "text-emerald-glow" },
  { icon: AlertTriangle, label: "Flagged", value: "5", color: "text-rose-glow" },
];

const IdentityGraphPage = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 container mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold mb-1">Identity Graph</h1>
          <p className="text-muted-foreground mb-6">
            Visualize connections between users, devices, and fraud signals in real time
          </p>
        </motion.div>

        {/* Risk Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {riskSummary.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <div>
                  <div className="text-xl font-display font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Graph */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-xl overflow-hidden"
          style={{ height: "calc(100vh - 320px)", minHeight: 400 }}
        >
          <IdentityGraph />
        </motion.div>
      </div>
    </div>
  );
};

export default IdentityGraphPage;
