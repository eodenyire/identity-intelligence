import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/landing/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const apiCallsDaily = [
  { date: "Mar 24", calls: 4200, errors: 42 },
  { date: "Mar 25", calls: 5100, errors: 38 },
  { date: "Mar 26", calls: 4800, errors: 55 },
  { date: "Mar 27", calls: 6200, errors: 31 },
  { date: "Mar 28", calls: 7100, errors: 28 },
  { date: "Mar 29", calls: 5900, errors: 47 },
  { date: "Mar 30", calls: 4300, errors: 22 },
  { date: "Mar 31", calls: 6800, errors: 35 },
  { date: "Apr 1", calls: 7500, errors: 41 },
  { date: "Apr 2", calls: 8200, errors: 29 },
];

const apiCallsHourly = [
  { hour: "00:00", calls: 120 },
  { hour: "02:00", calls: 85 },
  { hour: "04:00", calls: 60 },
  { hour: "06:00", calls: 180 },
  { hour: "08:00", calls: 420 },
  { hour: "10:00", calls: 680 },
  { hour: "12:00", calls: 750 },
  { hour: "14:00", calls: 820 },
  { hour: "16:00", calls: 690 },
  { hour: "18:00", calls: 540 },
  { hour: "20:00", calls: 380 },
  { hour: "22:00", calls: 210 },
];

const verificationsByType = [
  { name: "KYC Full", value: 4820, color: "hsl(187, 92%, 52%)" },
  { name: "Face Match", value: 3210, color: "hsl(265, 85%, 60%)" },
  { name: "ID + Liveness", value: 2950, color: "hsl(160, 84%, 39%)" },
  { name: "Document Only", value: 1867, color: "hsl(38, 92%, 50%)" },
];

const verificationOutcomes = [
  { name: "Verified", value: 11240, color: "hsl(160, 84%, 39%)" },
  { name: "Flagged", value: 892, color: "hsl(38, 92%, 50%)" },
  { name: "Rejected", value: 715, color: "hsl(350, 89%, 60%)" },
];

const trustScoreDistribution = [
  { range: "0-100", count: 215 },
  { range: "101-200", count: 180 },
  { range: "201-300", count: 310 },
  { range: "301-400", count: 420 },
  { range: "401-500", count: 580 },
  { range: "501-600", count: 890 },
  { range: "601-700", count: 1420 },
  { range: "701-800", count: 2850 },
  { range: "801-900", count: 3640 },
  { range: "901-1000", count: 2342 },
];

const responseTimeData = [
  { date: "Mar 24", p50: 120, p95: 340, p99: 780 },
  { date: "Mar 25", p50: 115, p95: 310, p99: 720 },
  { date: "Mar 26", p50: 130, p95: 380, p99: 850 },
  { date: "Mar 27", p50: 108, p95: 290, p99: 650 },
  { date: "Mar 28", p50: 112, p95: 305, p99: 690 },
  { date: "Mar 29", p50: 125, p95: 350, p99: 810 },
  { date: "Mar 30", p50: 105, p95: 275, p99: 620 },
  { date: "Mar 31", p50: 118, p95: 320, p99: 740 },
  { date: "Apr 1", p50: 110, p95: 295, p99: 670 },
  { date: "Apr 2", p50: 102, p95: 268, p99: 590 },
];

const endpointBreakdown = [
  { endpoint: "/verify/kyc", calls: 4820, avgMs: 245, errorRate: 0.3 },
  { endpoint: "/verify/face", calls: 3210, avgMs: 180, errorRate: 0.5 },
  { endpoint: "/verify/liveness", calls: 2950, avgMs: 310, errorRate: 0.2 },
  { endpoint: "/verify/document", calls: 1867, avgMs: 150, errorRate: 0.4 },
  { endpoint: "/trust-score", calls: 8420, avgMs: 45, errorRate: 0.1 },
  { endpoint: "/graph/query", calls: 2100, avgMs: 520, errorRate: 0.8 },
];

const kpiStats = [
  { icon: BarChart3, label: "Total API Calls", value: "60,100", change: "+18.4%", positive: true },
  { icon: Zap, label: "Avg Response Time", value: "112ms", change: "-8.2%", positive: true },
  { icon: TrendingUp, label: "Success Rate", value: "99.4%", change: "+0.2%", positive: true },
  { icon: Clock, label: "Avg Verification", value: "1.8s", change: "-12.5%", positive: true },
];

const tooltipStyle = {
  backgroundColor: "hsl(222, 44%, 9%)",
  border: "1px solid hsl(222, 20%, 18%)",
  borderRadius: "8px",
  fontSize: "12px",
};

const Analytics = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("7d");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-display font-bold mb-1">Usage Analytics</h1>
            <p className="text-muted-foreground">API performance, verification stats & trust score insights</p>
          </div>
          <div className="flex gap-2 mt-4 sm:mt-0">
            {(["24h", "7d", "30d"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                  timeRange === range
                    ? "bg-primary text-primary-foreground"
                    : "glass text-muted-foreground hover:text-foreground"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </motion.div>

        {/* KPI Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpiStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <stat.icon className="w-5 h-5 text-primary" />
                <span className={`text-xs font-mono flex items-center gap-0.5 ${
                  stat.positive ? "text-emerald-glow" : "text-rose-glow"
                }`}>
                  {stat.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.change}
                </span>
              </div>
              <div className="text-2xl font-display font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* API Call Volume */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-xl p-6 mb-8"
        >
          <Tabs defaultValue="daily">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold">API Call Volume</h3>
              <TabsList className="bg-secondary">
                <TabsTrigger value="daily" className="text-xs">Daily</TabsTrigger>
                <TabsTrigger value="hourly" className="text-xs">Hourly</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="daily">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={apiCallsDaily}>
                  <defs>
                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(187, 92%, 52%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(187, 92%, 52%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(350, 89%, 60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(350, 89%, 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 20%, 18%)" />
                  <XAxis dataKey="date" stroke="hsl(215, 20%, 55%)" fontSize={12} />
                  <YAxis stroke="hsl(215, 20%, 55%)" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="calls" stroke="hsl(187, 92%, 52%)" fill="url(#colorCalls)" strokeWidth={2} name="API Calls" />
                  <Area type="monotone" dataKey="errors" stroke="hsl(350, 89%, 60%)" fill="url(#colorErrors)" strokeWidth={2} name="Errors" />
                </AreaChart>
              </ResponsiveContainer>
            </TabsContent>
            <TabsContent value="hourly">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={apiCallsHourly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 20%, 18%)" />
                  <XAxis dataKey="hour" stroke="hsl(215, 20%, 55%)" fontSize={12} />
                  <YAxis stroke="hsl(215, 20%, 55%)" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="calls" fill="hsl(187, 92%, 52%)" radius={[4, 4, 0, 0]} name="Calls" />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Verification Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-xl p-6"
          >
            <h3 className="font-display font-semibold mb-4">Verifications by Type</h3>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={verificationsByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {verificationsByType.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 flex-1">
                {verificationsByType.map((type) => (
                  <div key={type.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: type.color }} />
                      <span className="text-sm text-muted-foreground">{type.name}</span>
                    </div>
                    <span className="text-sm font-mono font-bold text-foreground">{type.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Verification Outcomes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="glass rounded-xl p-6"
          >
            <h3 className="font-display font-semibold mb-4">Verification Outcomes</h3>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={verificationOutcomes}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {verificationOutcomes.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 flex-1">
                {verificationOutcomes.map((outcome) => {
                  const total = verificationOutcomes.reduce((s, o) => s + o.value, 0);
                  const pct = ((outcome.value / total) * 100).toFixed(1);
                  return (
                    <div key={outcome.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: outcome.color }} />
                          <span className="text-sm text-muted-foreground">{outcome.name}</span>
                        </div>
                        <span className="text-sm font-mono font-bold text-foreground">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: outcome.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Trust Score Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-xl p-6 mb-8"
        >
          <h3 className="font-display font-semibold mb-4">Trust Score Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={trustScoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 20%, 18%)" />
              <XAxis dataKey="range" stroke="hsl(215, 20%, 55%)" fontSize={11} />
              <YAxis stroke="hsl(215, 20%, 55%)" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Users" radius={[4, 4, 0, 0]}>
                {trustScoreDistribution.map((entry, index) => {
                  const score = parseInt(entry.range.split("-")[0]);
                  const color =
                    score >= 700 ? "hsl(160, 84%, 39%)" :
                    score >= 400 ? "hsl(38, 92%, 50%)" :
                    "hsl(350, 89%, 60%)";
                  return <Cell key={index} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Response Time + Endpoint Table */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="glass rounded-xl p-6"
          >
            <h3 className="font-display font-semibold mb-4">Response Time (ms)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 20%, 18%)" />
                <XAxis dataKey="date" stroke="hsl(215, 20%, 55%)" fontSize={12} />
                <YAxis stroke="hsl(215, 20%, 55%)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="p50" stroke="hsl(187, 92%, 52%)" strokeWidth={2} dot={false} name="P50" />
                <Line type="monotone" dataKey="p95" stroke="hsl(265, 85%, 60%)" strokeWidth={2} dot={false} name="P95" />
                <Line type="monotone" dataKey="p99" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={false} name="P99" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass rounded-xl p-6"
          >
            <h3 className="font-display font-semibold mb-4">Endpoint Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-mono text-muted-foreground pb-3">Endpoint</th>
                    <th className="text-right text-xs font-mono text-muted-foreground pb-3">Calls</th>
                    <th className="text-right text-xs font-mono text-muted-foreground pb-3">Avg (ms)</th>
                    <th className="text-right text-xs font-mono text-muted-foreground pb-3">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {endpointBreakdown.map((ep) => (
                    <tr key={ep.endpoint} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="py-3 text-sm font-mono text-primary">{ep.endpoint}</td>
                      <td className="py-3 text-sm font-mono text-foreground text-right">{ep.calls.toLocaleString()}</td>
                      <td className="py-3 text-sm font-mono text-muted-foreground text-right">{ep.avgMs}</td>
                      <td className="py-3 text-right">
                        <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                          ep.errorRate < 0.3
                            ? "bg-emerald-glow/10 text-emerald-glow"
                            : ep.errorRate < 0.6
                            ? "bg-amber-glow/10 text-amber-glow"
                            : "bg-rose-glow/10 text-rose-glow"
                        }`}>
                          {ep.errorRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
