import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, User, Lock, ArrowLeft, Mail } from "lucide-react";
import { loginAsMentor, loginAsStudent } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type View = "student" | "mentor" | "forgot";

// Generate random candlestick data once
const generateCandlesticks = () =>
  Array.from({ length: 25 }, (_, i) => ({
    height: 30 + Math.random() * 90,
    wickHeight: 8 + Math.random() * 20,
    isGreen: Math.random() > 0.5,
    key: i,
  }));

const Login = () => {
  const [view, setView] = useState<View>("student");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const candlesticks = useMemo(generateCandlesticks, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setTimeout(async () => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, approved")
            .eq("id", session.user.id)
            .single();

          if (!profile) return;

          if (profile.role === "mentor") navigate("/dashboard");
          else navigate("/student");
        }, 0);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);


  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("קישור לאיפוס סיסמא נשלח לאימייל שלך");
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (view === "mentor" && (!username.trim() || !password.trim())) return;
    if (view === "student" && (!email.trim() || !password.trim())) return;
    setLoading(true);

    try {
      if (view === "mentor") {
        await loginAsMentor(username, password);
        toast.success("ברוך הבא, עידן!");
        navigate("/dashboard");
      } else {
        await loginAsStudent(email, password);
        toast.success("ברוך הבא!");
        navigate("/student");
      }
    } catch (err: any) {
      toast.error(err.message || "שגיאה בהתחברות");
    } finally {
      setLoading(false);
    }
  };

  // Mentor login view
  if (view === "mentor") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" dir="rtl" lang="he" style={{ background: "#0a0a0a" }}>
        <div className="w-full max-w-sm animate-fade-in">
          <button onClick={() => setView("student")} className="flex items-center gap-1 mb-6 text-sm transition-colors" style={{ color: "#888" }}>
            <ArrowLeft className="h-4 w-4" />
            חזרה
          </button>
          <div style={{ background: "linear-gradient(145deg, rgba(42,42,42,0.9), rgba(26,26,26,0.95))", border: "1px solid rgba(212,160,23,0.15)", borderRadius: 20, padding: "44px 40px", backdropFilter: "blur(20px)" }}>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "linear-gradient(135deg, #d4a017, #b8860b)" }}>
                <GraduationCap className="h-7 w-7" style={{ color: "#000" }} />
              </div>
              <h2 className="text-xl font-bold" style={{ color: "#fff" }}>כניסת מנטור</h2>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block mb-1.5" style={{ fontSize: 13, color: "#aaa", fontWeight: 500 }}>שם משתמש</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="שם המנטור" dir="rtl"
                  style={{ width: "100%", padding: "14px 18px", background: "rgba(15,15,15,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#fff", fontSize: 14, outline: "none" }}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(212,160,23,0.5)"; e.target.style.boxShadow = "0 0 20px rgba(212,160,23,0.08)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
                />
              </div>
              <div>
                <label className="block mb-1.5" style={{ fontSize: 13, color: "#aaa", fontWeight: 500 }}>סיסמא</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  style={{ width: "100%", padding: "14px 18px", background: "rgba(15,15,15,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#fff", fontSize: 14, outline: "none" }}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(212,160,23,0.5)"; e.target.style.boxShadow = "0 0 20px rgba(212,160,23,0.08)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
                />
              </div>
              <button type="submit" disabled={loading}
                style={{ width: "100%", padding: 16, background: "linear-gradient(135deg, #d4a017, #b8860b)", borderRadius: 12, color: "#000", fontSize: 17, fontWeight: 700, letterSpacing: 1, border: "none", cursor: "pointer", opacity: loading ? 0.5 : 1 }}>
                {loading ? "מתחבר..." : "התחברות"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Forgot password view
  if (view === "forgot") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" dir="rtl" lang="he" style={{ background: "#0a0a0a" }}>
        <div className="w-full max-w-sm animate-fade-in">
          <button onClick={() => setView("student")} className="flex items-center gap-1 mb-6 text-sm transition-colors" style={{ color: "#888" }}>
            <ArrowLeft className="h-4 w-4" />
            חזרה
          </button>
          <div style={{ background: "linear-gradient(145deg, rgba(42,42,42,0.9), rgba(26,26,26,0.95))", border: "1px solid rgba(212,160,23,0.15)", borderRadius: 20, padding: "44px 40px", backdropFilter: "blur(20px)" }}>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(212,160,23,0.1)" }}>
                <Mail className="h-7 w-7" style={{ color: "#d4a017" }} />
              </div>
              <h2 className="text-xl font-bold" style={{ color: "#fff" }}>שכחתי סיסמא</h2>
              <p className="mt-1" style={{ fontSize: 14, color: "#888" }}>נשלח לך קישור לאיפוס הסיסמא</p>
            </div>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block mb-1.5" style={{ fontSize: 13, color: "#aaa", fontWeight: 500 }}>כתובת אימייל</label>
                <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="your@email.com" dir="ltr" style={{ width: "100%", padding: "14px 18px", background: "rgba(15,15,15,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#fff", fontSize: 14, textAlign: "left", outline: "none" }}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(212,160,23,0.5)"; e.target.style.boxShadow = "0 0 20px rgba(212,160,23,0.08)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
                />
              </div>
              <button type="submit" disabled={loading}
                style={{ width: "100%", padding: 16, background: "linear-gradient(135deg, #d4a017, #b8860b)", borderRadius: 12, color: "#000", fontSize: 17, fontWeight: 700, letterSpacing: 1, border: "none", cursor: "pointer", opacity: loading ? 0.5 : 1 }}>
                {loading ? "שולח..." : "שלח קישור איפוס"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Main student login
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center font-heebo" dir="rtl" lang="he" style={{ background: "#0a0a0a" }}>
      {/* Grid pattern */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(212,160,23,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(212,160,23,0.03) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />

      {/* Floating orbs */}
      <div className="absolute pointer-events-none" style={{
        top: "-50px", right: "-50px", width: 300, height: 300,
        background: "rgba(212,160,23,0.06)", borderRadius: "50%", filter: "blur(80px)",
        animation: "floatOrb1 8s ease-in-out infinite",
      }} />
      <div className="absolute pointer-events-none" style={{
        bottom: "50px", left: "-30px", width: 200, height: 200,
        background: "rgba(46,204,113,0.04)", borderRadius: "50%", filter: "blur(60px)",
        animation: "floatOrb2 8s ease-in-out infinite",
      }} />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[460px] px-4 animate-fade-in">
        {/* Logo section */}
        <div className="text-center mb-10">
          <div className="mx-auto mb-4" style={{ width: 70, height: 70 }}>
            <svg viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg" width="70" height="70">
              <defs>
                <linearGradient id="goldGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#b8860b" />
                  <stop offset="100%" stopColor="#e8c430" />
                </linearGradient>
              </defs>
              <line x1="10" y1="55" x2="60" y2="55" stroke="url(#goldGrad)" strokeWidth="2" opacity="0.3" />
              <polyline points="12,50 28,38 40,42 58,18" stroke="url(#goldGrad)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <polygon points="58,18 58,26 50,22" fill="url(#goldGrad)" />
            </svg>
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 900, color: "#d4a017", letterSpacing: 6, textTransform: "uppercase", margin: 0, lineHeight: 1 }}>FUTURES</h1>
          <p style={{ fontSize: 14, color: "#888", letterSpacing: 4, marginTop: 6 }}>הבית לסוחרים</p>
        </div>

        {/* Login card */}
        <div style={{
          background: "linear-gradient(145deg, rgba(42,42,42,0.9), rgba(26,26,26,0.95))",
          border: "1px solid rgba(212,160,23,0.15)",
          borderRadius: 20,
          padding: "44px 40px",
          backdropFilter: "blur(20px)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(212,160,23,0.03)",
        }}>
          {/* Title */}
          <div className="text-center" style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: 0 }}>ברוך הבא</h2>
            <p style={{ fontSize: 14, color: "#888", marginTop: 8 }}>התחבר לפורטל התלמידים שלך</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block mb-1.5" style={{ fontSize: 13, color: "#aaa", fontWeight: 500 }}>כתובת אימייל</label>
              <div className="relative">
                <Mail className="absolute top-1/2 -translate-y-1/2" style={{ left: 14, color: "#555", width: 18, height: 18 }} />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com" dir="ltr"
                  className="login-input"
                  style={{
                    width: "100%", padding: "14px 18px", paddingLeft: 42,
                    background: "rgba(15,15,15,0.8)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12, color: "#fff", fontSize: 14, textAlign: "left", outline: "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(212,160,23,0.5)"; e.target.style.boxShadow = "0 0 20px rgba(212,160,23,0.08)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block mb-1.5" style={{ fontSize: 13, color: "#aaa", fontWeight: 500 }}>סיסמה</label>
              <div className="relative">
                <Lock className="absolute top-1/2 -translate-y-1/2" style={{ left: 14, color: "#555", width: 18, height: 18 }} />
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" dir="ltr"
                  style={{
                    width: "100%", padding: "14px 18px", paddingLeft: 42,
                    background: "rgba(15,15,15,0.8)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12, color: "#fff", fontSize: 14, textAlign: "left", outline: "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(212,160,23,0.5)"; e.target.style.boxShadow = "0 0 20px rgba(212,160,23,0.08)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
                />
              </div>
            </div>

            {/* Options row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                <div style={{
                  width: 18, height: 18, borderRadius: 4,
                  border: rememberMe ? "2px solid #d4a017" : "2px solid rgba(212,160,23,0.4)",
                  background: rememberMe ? "#d4a017" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s", flexShrink: 0,
                }}>
                  {rememberMe && <span style={{ color: "#000", fontSize: 12, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, color: "#aaa" }}>זכור אותי</span>
              </div>
              <button type="button" onClick={() => setView("forgot")} className="transition-colors" style={{ fontSize: 13, color: "#d4a017", background: "none", border: "none", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#e8b82a")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#d4a017")}>
                שכחת סיסמה?
              </button>
            </div>

            {/* Login button */}
            <button type="submit" disabled={loading} className="group relative overflow-hidden" style={{
              width: "100%", padding: 16,
              background: "linear-gradient(135deg, #d4a017, #b8860b)",
              borderRadius: 12, color: "#000", fontSize: 17, fontWeight: 700, letterSpacing: 1,
              border: "none", cursor: "pointer", opacity: loading ? 0.5 : 1,
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(212,160,23,0.3)"; } }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
              <span className="absolute inset-0 pointer-events-none" style={{
                background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)",
                transform: "translateX(100%)",
                transition: "transform 0.6s",
              }} />
              {loading ? "מתחבר..." : "התחברות"}
            </button>
          </form>


          {/* Security badge */}
          <div className="flex items-center justify-center gap-1.5" style={{ marginTop: 20 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span style={{ fontSize: 11, color: "#444" }}>חיבור מאובטח ומוצפן</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center" style={{ marginTop: 28 }}>
          <span style={{ fontSize: 13, color: "#666" }}>אין לך חשבון? </span>
          <button style={{ fontSize: 13, color: "#d4a017", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}>
            צור קשר לקבלת גישה
          </button>
        </div>

        {/* Mentor access link */}
        <div className="text-center" style={{ marginTop: 12 }}>
          <button onClick={() => setView("mentor")} style={{ fontSize: 11, color: "#444", background: "none", border: "none", cursor: "pointer", transition: "color 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#888")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}>
            כניסת מנטור
          </button>
        </div>
      </div>

      {/* Candlesticks */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-[10px] pointer-events-none" style={{ height: 120, opacity: 0.06 }}>
        {candlesticks.map((c) => (
          <div key={c.key} className="flex flex-col items-center">
            <div style={{ width: 2, height: c.wickHeight, background: c.isGreen ? "#2ecc71" : "#e74c3c" }} />
            <div style={{ width: 6, height: c.height, background: c.isGreen ? "#2ecc71" : "#e74c3c", borderRadius: 1 }} />
          </div>
        ))}
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes floatOrb1 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(20px); }
        }
        @keyframes floatOrb2 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        input::placeholder { color: #555 !important; }
      `}</style>
    </div>
  );
};

export default Login;
