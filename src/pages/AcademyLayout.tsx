import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  BookOpen, Users, Settings, LogOut, ChevronRight, ChevronLeft,
  LayoutDashboard, GraduationCap, ArrowLeft,
} from "lucide-react";
import AcademyCoursesPage from "./AcademyCoursesPage";
import AcademyAllStudentsView from "@/components/academy/AcademyAllStudentsView";

type View = "courses" | "students" | "settings";

const navItems: { icon: React.ElementType; label: string; view: View }[] = [
  { icon: BookOpen, label: "קורסים", view: "courses" },
  { icon: Users, label: "תלמידים", view: "students" },
  { icon: Settings, label: "הגדרות", view: "settings" },
];

export default function AcademyLayout() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [activeView, setActiveView] = useState<View>(() => {
    const tab = searchParams.get("tab");
    if (tab === "students") return "students";
    return "courses";
  });
  const [initialSort] = useState(() => searchParams.get("sort") || undefined);
  const [initialDateFilter] = useState(() => searchParams.get("dateFilter") || undefined);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mentorName, setMentorName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (searchParams.toString()) setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => { setSidebarOpen(!isMobile); }, [isMobile]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profile?.role !== "mentor") { navigate("/"); return; }
      setMentorName(profile.display_name);
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getInitials = (n: string) => n.split(" ").map(w => w[0]).join("").slice(0, 2);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "rgb(36, 36, 34)" }}>
        <div className="w-8 h-8 border-2 border-academy-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "rgb(36, 36, 34)", color: "#fff" }} dir="rtl">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-60" : "w-16"} shrink-0 flex flex-col transition-all duration-300 relative ${isMobile && !sidebarOpen ? "hidden" : ""}`}
        style={{ background: "rgb(30, 30, 28)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,189,2,0.15)" }}>
            <GraduationCap className="w-5 h-5" style={{ color: "#ffbd02" }} />
          </div>
          {sidebarOpen && <span className="font-bold text-sm tracking-tight font-outfit">Academy</span>}
        </div>

        {/* Back to dashboard */}
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 mx-2 mt-3 mb-1 px-3 py-2 rounded-xl text-sm transition-all hover:bg-white/[0.04]"
          style={{ color: "#b8b8b8" }}
        >
          <ArrowLeft className="w-4 h-4" />
          {sidebarOpen && <span>חזרה לדשבורד</span>}
        </button>

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => setActiveView(item.view)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200`}
                style={{
                  background: isActive ? "rgba(255,189,2,0.12)" : "transparent",
                  color: isActive ? "#ffbd02" : "#b8b8b8",
                }}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "linear-gradient(135deg, #ffbd02, #e6a800)", color: "rgb(36,36,34)" }}>
              {getInitials(mentorName || "M")}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{mentorName}</p>
                <p className="text-[10px]" style={{ color: "#666" }}>מנהל</p>
              </div>
            )}
            {sidebarOpen && (
              <button onClick={handleLogout} className="transition-colors" style={{ color: "#666" }}>
                <LogOut className="w-4 h-4 hover:text-red-400" />
              </button>
            )}
          </div>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-20 -left-3 w-6 h-6 rounded-full flex items-center justify-center z-10 transition-colors"
          style={{ background: "rgb(45,45,43)", border: "1px solid rgba(255,255,255,0.1)", color: "#b8b8b8" }}
        >
          {sidebarOpen ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {isMobile && (
          <div className="h-14 flex items-center justify-between px-4 shrink-0" style={{ background: "rgb(30,30,28)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                <GraduationCap className="w-4 h-4" style={{ color: "#ffbd02" }} />
              </button>
              <span className="font-bold text-sm font-outfit">Academy</span>
            </div>
            <button onClick={handleLogout} style={{ color: "#666" }}><LogOut className="w-4 h-4" /></button>
          </div>
        )}

        <main className="flex-1 overflow-hidden">
          {activeView === "courses" && <AcademyCoursesPage />}
          {activeView === "students" && <AcademyAllStudentsView initialSort={initialSort} initialDateFilter={initialDateFilter} />}
          {activeView === "settings" && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <Settings className="w-16 h-16 mx-auto" style={{ color: "#444" }} />
                <p className="text-lg font-medium" style={{ color: "#888" }}>הגדרות — בקרוב</p>
              </div>
            </div>
          )}
        </main>

        {isMobile && (
          <div className="h-16 flex items-center shrink-0 px-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgb(30,30,28)" }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => setActiveView(item.view)}
                  className="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl mx-0.5 transition-all duration-200"
                  style={{
                    color: isActive ? "#ffbd02" : "#666",
                    background: isActive ? "rgba(255,189,2,0.08)" : "transparent",
                  }}
                >
                  <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
                  <span className="text-[10px] font-semibold">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
