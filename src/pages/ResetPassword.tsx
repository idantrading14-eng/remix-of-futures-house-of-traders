import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, ArrowLeft } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("הסיסמא חייבת להכיל לפחות 6 תווים"); return; }
    if (password !== confirm) { toast.error("הסיסמאות לא תואמות"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { toast.error(error.message); setLoading(false); return; }
    toast.success("הסיסמא עודכנה בהצלחה!");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero p-4" dir="rtl">
      <div className="w-full max-w-sm animate-fade-in">
        <button onClick={() => navigate("/")} className="flex items-center gap-1 text-primary-foreground/60 hover:text-primary-foreground mb-6 text-sm transition-colors">
          <ArrowLeft className="h-4 w-4" />
          חזרה להתחברות
        </button>

        <div className="bg-card rounded-2xl p-6 shadow-card">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-secondary/20 flex items-center justify-center mx-auto mb-3">
              <Lock className="h-7 w-7 text-secondary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">איפוס סיסמא</h2>
            <p className="text-xs text-muted-foreground mt-1">הכנס סיסמא חדשה</p>
          </div>

          {!ready ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">מאמת את הקישור...</p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">סיסמא חדשה</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="לפחות 6 תווים"
                  className="w-full px-3 py-2.5 rounded-xl bg-muted text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">אימות סיסמא</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="הכנס שוב"
                  className="w-full px-3 py-2.5 rounded-xl bg-muted text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                />
              </div>
              <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                {loading ? "מעדכן..." : "עדכן סיסמא"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
