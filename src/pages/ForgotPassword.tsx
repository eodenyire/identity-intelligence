import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-hero" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <Link
          to="/auth"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>

        <div className="glass rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="relative">
              <Shield className="w-8 h-8 text-primary" />
              <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">
              Trust<span className="text-gradient-primary">Layer</span>
            </span>
          </div>

          {sent ? (
            <div className="text-center space-y-3">
              <Mail className="w-12 h-12 text-primary mx-auto" />
              <h2 className="text-xl font-display font-bold text-foreground">Check your email</h2>
              <p className="text-sm text-muted-foreground">
                We sent a password reset link to <span className="text-foreground font-medium">{email}</span>
              </p>
              <Link to="/auth">
                <Button variant="ghost" className="mt-4">Back to sign in</Button>
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-display font-bold text-foreground mb-1">Reset your password</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your email and we'll send you a reset link.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                      className="pl-10 bg-secondary border-border"
                    />
                  </div>
                </div>
                <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
