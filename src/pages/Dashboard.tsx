import { motion } from "framer-motion";
import Navbar from "@/components/landing/Navbar";
import TrustScoreRing from "@/components/landing/TrustScoreRing";
import {
  ShieldCheck,
  AlertTriangle,
  Users,
  Activity,
  TrendingUp,
  Fingerprint,
  Globe,
  Eye,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const verificationData = [
  { name: "Mon", verifications: 1240, fraud: 12 },
  { name: "Tue", verifications: 1890, fraud: 8 },
  { name: "Wed", verifications: 2300, fraud: 23 },
  { name: "Thu", verifications: 1950, fraud: 15 },
  { name: "Fri", verifications: 2780, fraud: 19 },
  { name: "Sat", verifications: 1560, fraud: 7 },
  { name: "Sun", verifications: 980, fraud: 5 },
];

const recentVerifications = [
  { id: "VRF-8842", name: "John M.", type: "KYC Full", score: 923, status: "Verified", time: "2m ago" },
  { id: "VRF-8841", name: "Grace W.", type: "Face Match", score: 871, status: "Verified", time: "5m ago" },
  { id: "VRF-8840", name: "David K.", type: "KYC Full", score: 312, status: "Flagged", time: "8m ago" },
  { id: "VRF-8839", name: "Sarah N.", type: "ID + Liveness", score: 945, status: "Verified", time: "12m ago" },
  { id: "VRF-8838", name: "Unknown", type: "Face Match", score: 89, status: "Rejected", time: "15m ago" },
];

const stats = [
  { icon: Users, label: "Total Verifications", value: "12,847", change: "+14.2%", color: "text-primary" },
  { icon: ShieldCheck, label: "Trust Score Avg", value: "847", change: "+2.1%", color: "text-emerald-glow" },
  { icon: AlertTriangle, label: "Fraud Detected", value: "89", change: "-8.3%", color: "text-amber-glow" },
  { icon: Activity, label: "API Uptime", value: "99.97%", change: "Stable", color: "text-violet-glow" },
];

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 container mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold mb-2">Identity Dashboard</h1>
          <p className="text-muted-foreground mb-8">Real-time verification intelligence & trust monitoring</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <span className="text-xs font-mono text-emerald-glow">{stat.change}</span>
              </div>
              <div className="text-2xl font-display font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 glass rounded-xl p-6"
          >
            <h3 className="font-display font-semibold mb-4">Verification Volume</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={verificationData}>
                <defs>
                  <linearGradient id="colorVerifications" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(187, 92%, 52%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(187, 92%, 52%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 20%, 18%)" />
                <XAxis dataKey="name" stroke="hsl(215, 20%, 55%)" fontSize={12} />
                <YAxis stroke="hsl(215, 20%, 55%)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222, 44%, 9%)",
                    border: "1px solid hsl(222, 20%, 18%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="verifications"
                  stroke="hsl(187, 92%, 52%)"
                  fill="url(#colorVerifications)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Trust Score Widget */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-xl p-6 flex flex-col items-center justify-center"
          >
            <h3 className="font-display font-semibold mb-4">System Trust Score</h3>
            <TrustScoreRing score={847} size={200} />
            <div className="mt-4 flex gap-4 text-center">
              <div>
                <div className="text-sm font-bold text-emerald-glow">92.3%</div>
                <div className="text-xs text-muted-foreground">Approval</div>
              </div>
              <div>
                <div className="text-sm font-bold text-rose-glow">0.7%</div>
                <div className="text-xs text-muted-foreground">Fraud</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Recent Verifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-xl p-6"
        >
          <h3 className="font-display font-semibold mb-4">Recent Verifications</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-mono text-muted-foreground pb-3">ID</th>
                  <th className="text-left text-xs font-mono text-muted-foreground pb-3">Name</th>
                  <th className="text-left text-xs font-mono text-muted-foreground pb-3">Type</th>
                  <th className="text-left text-xs font-mono text-muted-foreground pb-3">Trust Score</th>
                  <th className="text-left text-xs font-mono text-muted-foreground pb-3">Status</th>
                  <th className="text-right text-xs font-mono text-muted-foreground pb-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentVerifications.map((v) => (
                  <tr key={v.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="py-3 text-sm font-mono text-muted-foreground">{v.id}</td>
                    <td className="py-3 text-sm text-foreground">{v.name}</td>
                    <td className="py-3 text-sm text-muted-foreground">{v.type}</td>
                    <td className="py-3">
                      <span className={`text-sm font-mono font-bold ${
                        v.score >= 700 ? "text-emerald-glow" : v.score >= 300 ? "text-amber-glow" : "text-rose-glow"
                      }`}>
                        {v.score}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`text-xs font-mono px-2 py-1 rounded-full ${
                        v.status === "Verified"
                          ? "bg-emerald-glow/10 text-emerald-glow"
                          : v.status === "Flagged"
                          ? "bg-amber-glow/10 text-amber-glow"
                          : "bg-rose-glow/10 text-rose-glow"
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3 text-right text-xs text-muted-foreground">{v.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Active Services */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8"
        >
          {[
            { icon: Fingerprint, label: "Biometric Engine", status: "Active" },
            { icon: Globe, label: "Data Verification", status: "Active" },
            { icon: Eye, label: "Liveness Detection", status: "Active" },
            { icon: TrendingUp, label: "Graph Engine", status: "Active" },
          ].map((service, i) => (
            <div key={service.label} className="glass rounded-xl p-4 flex items-center gap-3">
              <service.icon className="w-5 h-5 text-primary" />
              <div>
                <div className="text-sm font-semibold text-foreground">{service.label}</div>
                <div className="text-xs text-emerald-glow font-mono">{service.status}</div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
