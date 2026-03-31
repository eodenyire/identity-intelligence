import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, Plus, Copy, Trash2, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

const generateAPIKey = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "tl_live_";
  for (let i = 0; i < 40; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
};

const hashKey = async (key: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

const APIKeysManager = () => {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchKeys = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setKeys(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchKeys();
  }, [user]);

  const createKey = async () => {
    if (!user || !newKeyName.trim()) return;
    const fullKey = generateAPIKey();
    const hash = await hashKey(fullKey);
    const prefix = fullKey.substring(0, 12) + "...";

    const { error } = await supabase.from("api_keys").insert({
      user_id: user.id,
      name: newKeyName.trim(),
      key_prefix: prefix,
      key_hash: hash,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setRevealedKey(fullKey);
    setNewKeyName("");
    setShowCreate(false);
    fetchKeys();
    toast({ title: "API Key Created", description: "Copy it now — it won't be shown again." });
  };

  const deleteKey = async (id: string) => {
    const { error } = await supabase.from("api_keys").delete().eq("id", id);
    if (!error) {
      setKeys(keys.filter((k) => k.id !== id));
      toast({ title: "Key revoked" });
    }
  };

  const copyKey = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          API Keys
        </h3>
        <Button
          variant="hero"
          size="sm"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4" />
          Create Key
        </Button>
      </div>

      {/* Revealed key banner */}
      <AnimatePresence>
        {revealedKey && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-amber-glow/10 border border-amber-glow/30 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-glow shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-glow mb-1">
                  Copy your API key now — it won't be shown again
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-foreground bg-secondary px-3 py-2 rounded-lg break-all flex-1">
                    {revealedKey}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      copyKey(revealedKey, "revealed");
                      setRevealedKey(null);
                    }}
                  >
                    {copiedId === "revealed" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create key form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-xl p-4"
          >
            <div className="flex gap-2">
              <Input
                placeholder="Key name (e.g. Production, Staging)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="bg-secondary border-border"
                onKeyDown={(e) => e.key === "Enter" && createKey()}
              />
              <Button variant="hero" size="sm" onClick={createKey} disabled={!newKeyName.trim()}>
                Create
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keys list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Key className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No API keys yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((key, i) => (
            <motion.div
              key={key.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{key.name}</span>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                    key.is_active
                      ? "bg-emerald-glow/10 text-emerald-glow"
                      : "bg-rose-glow/10 text-rose-glow"
                  }`}>
                    {key.is_active ? "Active" : "Revoked"}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <code className="text-xs font-mono text-muted-foreground">{key.key_prefix}</code>
                  <span className="text-xs text-muted-foreground">
                    Created {new Date(key.created_at).toLocaleDateString()}
                  </span>
                  {key.last_used_at && (
                    <span className="text-xs text-muted-foreground">
                      Last used {new Date(key.last_used_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyKey(key.key_prefix, key.id)}
                  className="h-8 w-8"
                >
                  {copiedId === key.id ? (
                    <Check className="w-4 h-4 text-emerald-glow" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteKey(key.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-rose-glow"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default APIKeysManager;
