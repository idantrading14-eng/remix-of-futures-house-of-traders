import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { logout } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  BookOpen, Users, Settings, LogOut, ChevronRight, ChevronLeft,
  GraduationCap, Plus, Search, Shield, ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";
import AcademyCourseDetail from "@/components/academy/AcademyCourseDetail";
import AcademyAddCourseModal from "@/components/academy/AcademyAddCourseModal";
import AccessManagementModal from "@/components/academy/AccessManagementModal";
import MentorTestsView from "@/components/academy/tests/MentorTestsView";

type View = "courses" | "students" | "tests" | "settings";

const navItems: { icon: React.ElementType; label: string; view: View }[] = [
  { icon: BookOpen, label: "קורסים", view: "courses" },
  { icon: Users, label: "תלמידים", view: "students" },
  { icon: ClipboardCheck, label: "מבחנים", view: "tests" },
  { icon: Settings, label: "הגדרות", view: "settings" },
];

type Course = { id: string; title: string; description: string | null; thumbnail_url: string | null; type: string; price: number; content_type: string };
type Student = { id: string; display_name: string; created_at: string; enrollment_count: number };

export default function AppShell() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeView, setActiveView] = useState<View>("courses");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mentorName, setMentorName] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

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

  const handleLogout = async () => { await logout(); navigate("/"); };
  const getInitials = (n: string) => n.split(" ").map(w => w[0]).join("").slice(0, 2);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "rgb(36,36,34)" }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "#ffbd02", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "rgb(36,36,34)", color: "#fff" }} dir="rtl">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-60" : "w-16"} shrink-0 flex flex-col transition-all duration-300 relative ${isMobile && !sidebarOpen ? "hidden" : ""}`}
        style={{ background: "rgb(30,30,28)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="h-16 flex items-center gap-3 px-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,189,2,0.15)" }}>
            <GraduationCap className="w-5 h-5" style={{ color: "#ffbd02" }} />
          </div>
          {sidebarOpen && <span className="font-bold text-sm tracking-tight font-outfit">Academy</span>}
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => { setActiveView(item.view); setSelectedCourseId(null); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200"
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

        <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "linear-gradient(135deg, #ffbd02, #e6a800)", color: "rgb(36,36,34)" }}>
              {getInitials(mentorName || "M")}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{mentorName}</p>
                <p className="text-[10px]" style={{ color: "#666" }}>מנטור</p>
              </div>
            )}
            {sidebarOpen && (
              <button onClick={handleLogout} className="transition-colors hover:text-red-400" style={{ color: "#666" }}>
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-20 -left-3 w-6 h-6 rounded-full flex items-center justify-center z-10"
          style={{ background: "rgb(45,45,43)", border: "1px solid rgba(255,255,255,0.1)", color: "#b8b8b8" }}
        >
          {sidebarOpen ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {isMobile && (
          <div className="h-14 flex items-center justify-between px-4 shrink-0" style={{ background: "rgb(30,30,28)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
              <GraduationCap className="w-4 h-4" style={{ color: "#ffbd02" }} />
            </button>
            <button onClick={handleLogout} style={{ color: "#666" }}><LogOut className="w-4 h-4" /></button>
          </div>
        )}

        <main className="flex-1 overflow-hidden">
          {activeView === "courses" && (
            selectedCourseId
              ? <AcademyCourseDetail courseId={selectedCourseId} onBack={() => setSelectedCourseId(null)} />
              : <CoursesListView onOpen={setSelectedCourseId} />
          )}
          {activeView === "students" && <StudentsListView />}
          {activeView === "tests" && <MentorTestsView />}
          {activeView === "settings" && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <Settings className="w-16 h-16 mx-auto" style={{ color: "#444" }} />
                <p className="text-lg font-medium" style={{ color: "#888" }}>הגדרות — בקרוב</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ───────── Courses list ───────── */
function CoursesListView({ onOpen }: { onOpen: (id: string) => void }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("courses").select("id, title, description, thumbnail_url, type, price, content_type").order("created_at", { ascending: false });
    setCourses((data as Course[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="h-full overflow-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-outfit">קורסים</h1>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]" style={{ background: "#ffbd02", color: "rgb(36,36,34)" }}>
          <Plus className="w-4 h-4" /> קורס חדש
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: "#888" }}>טוען...</div>
      ) : courses.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-16 h-16 mx-auto mb-3" style={{ color: "rgba(255,189,2,0.3)" }} />
          <p style={{ color: "#888" }}>עוד אין קורסים. הוסף קורס ראשון!</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map(c => (
            <button key={c.id} onClick={() => onOpen(c.id)} className="text-right rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="aspect-video relative" style={{ background: "rgba(255,255,255,0.04)" }}>
                {c.thumbnail_url ? (
                  <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-10 h-10" style={{ color: "rgba(255,189,2,0.3)" }} />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold font-outfit text-base mb-1">{c.title}</h3>
                {c.description && <p className="text-xs line-clamp-2" style={{ color: "#888" }}>{c.description}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      {showAdd && <AcademyAddCourseModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

/* ───────── Students list ───────── */
function StudentsListView() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [accessFor, setAccessFor] = useState<Student | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, created_at, role")
      .neq("role", "mentor")
      .order("created_at", { ascending: false });
    const list = (profiles || []) as any[];
    const counts = await Promise.all(list.map(async (p) => {
      const { count } = await supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("client_id", p.id);
      return count || 0;
    }));
    setStudents(list.map((p, i) => ({ id: p.id, display_name: p.display_name, created_at: p.created_at, enrollment_count: counts[i] })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = students.filter(s => s.display_name?.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="h-full overflow-auto p-6">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold font-outfit">תלמידים</h1>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#666" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש תלמיד..."
            className="pr-9 pl-4 py-2 rounded-xl text-sm w-64 outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: "#888" }}>טוען...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-16 h-16 mx-auto mb-3" style={{ color: "rgba(255,189,2,0.3)" }} />
          <p style={{ color: "#888" }}>אין תלמידים עדיין</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => (
            <div key={s.id} className="flex items-center justify-between p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "linear-gradient(135deg, #ffbd02, #e6a800)", color: "rgb(36,36,34)" }}>
                  {s.display_name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "?"}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm font-outfit truncate">{s.display_name}</p>
                  <p className="text-xs" style={{ color: "#888" }}>
                    {s.enrollment_count} {s.enrollment_count === 1 ? "קורס" : "קורסים"} • הצטרף {new Date(s.created_at).toLocaleDateString("he-IL")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAccessFor(s)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ background: "rgba(255,189,2,0.12)", color: "#ffbd02" }}
              >
                <Shield className="w-3.5 h-3.5" /> ניהול גישות
              </button>
            </div>
          ))}
        </div>
      )}

      {accessFor && (
        <AccessManagementModal
          studentId={accessFor.id}
          studentName={accessFor.display_name}
          studentEmail=""
          open={!!accessFor}
          onClose={() => { setAccessFor(null); load(); }}
        />
      )}
    </div>
  );
}
