import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { generateToken, statusColor, scoreColor } from "@/lib/kyc";
import {
  Plus,
  Copy,
  Check,
  Inbox,
  Search,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Clock,
} from "lucide-react";

interface Session {
  id: string;
  public_token: string;
  customer_name: string;
  customer_email: string | null;
  status: string;
  trust_score: number | null;
  id_type: string;
  country: string | null;
  created_at: string;
  completed_at: string | null;
}

const Onboarding = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<{ token: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [idType, setIdType] = useState<"national_id" | "passport" | "drivers_license" | "voter_id">(
    "national_id",
  );

  const fetchSessions = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("verification_sessions")
      .select("id,public_token,customer_name,customer_email,status,trust_score,id_type,country,created_at,completed_at")
      .order("created_at", { ascending: false });
    if (!error && data) setSessions(data as Session[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, [user]);

  const create = async () => {
    if (!user || !name.trim()) return;
    setCreating(true);
    const token = generateToken();
    const { error } = await supabase.from("verification_sessions").insert({
      user_id: user.id,
      public_token: token,
      customer_name: name.trim(),
      customer_email: email.trim() || null,
      customer_phone: phone.trim() || null,
      country: country.trim() || null,
      id_type: idType,
    });
    setCreating(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setRevealed({ token, name: name.trim() });
    setName("");
    setEmail("");
    setPhone("");
    setCountry("");
    setShowCreate(false);
    fetchSessions();
  };

  const verifyUrl = (token: string) =>
    `${window.location.origin}/verify/${token}`;

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(verifyUrl(token));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    toast({ title: "Verification link copied" });
  };

  const filtered = sessions.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.customer_name.toLowerCase().includes(q) ||
        (s.customer_email ?? "").toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const stats = {
    total: sessions.length,
    verified: sessions.filter((s) => s.status === "verified").length,
    pending: sessions.filter((s) => s.status === "pending" || s.status === "in_progress").length,
    flagged: sessions.filter((s) => s.status === "flagged" || s.status === "rejected").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-4 mb-8 flex-wrap"
        >
          <div>
            <h1 className="text-3xl font-display font-bold mb-1">Customer Onboarding</h1>
            <p className="text-muted-foreground">
              Create KYC sessions, send verification links, and review results
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="hero-outline" size="sm" asChild>
              <Link to="/webhooks">Webhooks</Link>
            </Button>
            <Button variant="hero" size="sm" onClick={() => setShowCreate((v) => !v)}>
              <Plus className="w-4 h-4" />
              New Verification
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { icon: Inbox, label: "Total Sessions", value: stats.total, color: "text-primary" },
            {
              icon: ShieldCheck,
              label: "Verified",
              value: stats.verified,
              color: "text-emerald-glow",
            },
            { icon: Clock, label: "Pending", value: stats.pending, color: "text-violet-glow" },
            {
              icon: AlertTriangle,
              label: "Flagged / Rejected",
              value: stats.flagged,
              color: "text-rose-glow",
            },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl p-4 flex items-center gap-3">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <div>
                <div className="text-2xl font-display font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Revealed link banner */}
        {revealed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="glass border border-emerald-glow/30 rounded-xl p-5 mb-6"
          >
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-glow shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-glow mb-1">
                  Verification session created for {revealed.name}
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Share this secure link with the customer. It expires in 7 days.
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-foreground bg-secondary px-3 py-2 rounded-lg break-all flex-1">
                    {verifyUrl(revealed.token)}
                  </code>
                  <Button variant="outline" size="sm" onClick={() => copyLink(revealed.token)}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button variant="hero-outline" size="sm" asChild>
                    <a href={verifyUrl(revealed.token)} target="_blank" rel="noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Create form */}
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="glass rounded-xl p-5 mb-6"
          >
            <h3 className="font-display font-semibold mb-4">New verification session</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Customer name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="bg-secondary border-border mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="bg-secondary border-border mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254 700 000000"
                  className="bg-secondary border-border mt-1"
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Kenya"
                  className="bg-secondary border-border mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label>ID document type</Label>
                <Select value={idType} onValueChange={(v) => setIdType(v as typeof idType)}>
                  <SelectTrigger className="bg-secondary border-border mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national_id">National ID</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="drivers_license">Driver's License</SelectItem>
                    <SelectItem value="voter_id">Voter ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button variant="hero" size="sm" onClick={create} disabled={creating || !name.trim()}>
                {creating ? "Creating..." : "Create & Get Link"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or session ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-secondary border-border"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sessions table */}
        <div className="glass rounded-xl p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {sessions.length === 0
                  ? "No verification sessions yet. Create one to get started."
                  : "No sessions match your filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-mono text-muted-foreground pb-3">Customer</th>
                    <th className="text-left text-xs font-mono text-muted-foreground pb-3">ID Type</th>
                    <th className="text-left text-xs font-mono text-muted-foreground pb-3">Trust Score</th>
                    <th className="text-left text-xs font-mono text-muted-foreground pb-3">Status</th>
                    <th className="text-left text-xs font-mono text-muted-foreground pb-3">Created</th>
                    <th className="text-right text-xs font-mono text-muted-foreground pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="py-3">
                        <Link
                          to={`/onboarding/${s.id}`}
                          className="text-sm text-foreground hover:text-primary"
                        >
                          {s.customer_name}
                        </Link>
                        {s.customer_email && (
                          <div className="text-xs text-muted-foreground">{s.customer_email}</div>
                        )}
                      </td>
                      <td className="py-3 text-sm text-muted-foreground capitalize">
                        {s.id_type.replace("_", " ")}
                      </td>
                      <td className="py-3">
                        <span className={`text-sm font-mono font-bold ${scoreColor(s.trust_score)}`}>
                          {s.trust_score ?? "—"}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`text-xs font-mono px-2 py-1 rounded-full ${statusColor(
                            s.status,
                          )}`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => copyLink(s.public_token)}
                            title="Copy verification link"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/onboarding/${s.id}`}>Review</Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
