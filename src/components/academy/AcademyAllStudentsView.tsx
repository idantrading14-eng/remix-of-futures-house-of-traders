import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search, BookOpen, Filter, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AcademyStudentDrawer from "./AcademyStudentDrawer";

type StudentRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  courses: string[];
  totalProgress: number;
  onboardingAnswer: string | null;
  joinDate: string | null;
};

type ProgressFilter = "all" | "not_started" | "in_progress" | "completed";
type DateFilter = "all" | "week" | "month" | "older";
type SortOption = "name_asc" | "progress_desc" | "date_desc";

interface AcademyAllStudentsViewProps {
  initialSort?: string;
  initialDateFilter?: string;
}

export default function AcademyAllStudentsView({ initialSort, initialDateFilter }: AcademyAllStudentsViewProps) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>((initialDateFilter as DateFilter) || "all");
  const [sortOption, setSortOption] = useState<SortOption>((initialSort as SortOption) || "name_asc");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: courses } = await supabase.from("courses").select("id, title, external_id");
      if (!courses) { setLoading(false); return; }

      const { data: enrollments } = await supabase.from("enrollments").select("client_id, course_id");
      const { data: allDetails } = await supabase.from("client_details").select("student_id, email, phone, product_ids");

      const studentCourses = new Map<string, Set<string>>();

      (enrollments || []).forEach((e: any) => {
        const course = courses.find(c => c.id === e.course_id);
        if (course) {
          if (!studentCourses.has(e.client_id)) studentCourses.set(e.client_id, new Set());
          studentCourses.get(e.client_id)!.add(course.title);
        }
      });

      (allDetails || []).forEach((d: any) => {
        const pids = Array.isArray(d.product_ids) ? d.product_ids : [];
        courses.forEach(c => {
          if (c.external_id && pids.includes(c.external_id)) {
            if (!studentCourses.has(d.student_id)) studentCourses.set(d.student_id, new Set());
            studentCourses.get(d.student_id)!.add(c.title);
          }
        });
      });

      const allStudentIds = Array.from(studentCourses.keys());
      if (allStudentIds.length === 0) { setStudents([]); setLoading(false); return; }

      const courseIds = courses.map(c => c.id);
      const { data: allModules } = await supabase.from("modules").select("id, course_id").in("course_id", courseIds);
      const moduleIds = (allModules || []).map(m => m.id);

      let allLessons: { id: string; module_id: string }[] = [];
      if (moduleIds.length > 0) {
        const { data } = await supabase.from("lessons").select("id, module_id").in("module_id", moduleIds);
        allLessons = data || [];
      }

      const courseLessonIds = new Map<string, string[]>();
      courses.forEach(c => {
        const mIds = (allModules || []).filter(m => m.course_id === c.id).map(m => m.id);
        const lIds = allLessons.filter(l => mIds.includes(l.module_id)).map(l => l.id);
        courseLessonIds.set(c.id, lIds);
        if (c.external_id) courseLessonIds.set(`ext_${c.external_id}`, lIds);
      });

      const studentLessonIds = new Map<string, Set<string>>();
      (enrollments || []).forEach((e: any) => {
        const lIds = courseLessonIds.get(e.course_id) || [];
        if (!studentLessonIds.has(e.client_id)) studentLessonIds.set(e.client_id, new Set());
        lIds.forEach(id => studentLessonIds.get(e.client_id)!.add(id));
      });
      (allDetails || []).forEach((d: any) => {
        const pids = Array.isArray(d.product_ids) ? d.product_ids : [];
        pids.forEach((pid: string) => {
          const lIds = courseLessonIds.get(`ext_${pid}`) || [];
          if (lIds.length > 0) {
            if (!studentLessonIds.has(d.student_id)) studentLessonIds.set(d.student_id, new Set());
            lIds.forEach(id => studentLessonIds.get(d.student_id)!.add(id));
          }
        });
      });

      const progressMap = new Map<string, number>();
      const progressPromises = allStudentIds.map(async (studentId) => {
        const relevantLessons = studentLessonIds.get(studentId);
        if (!relevantLessons || relevantLessons.size === 0) return;
        const lessonArr = Array.from(relevantLessons);
        const { data } = await supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("completed", true)
          .eq("client_id", studentId)
          .in("lesson_id", lessonArr);
        if (data && data.length > 0) {
          progressMap.set(studentId, Math.round((data.length / lessonArr.length) * 100));
        }
      });
      await Promise.all(progressPromises);

      const { data: onboardingData } = await supabase.from("onboarding_answers").select("user_id, time_vs_money");
      const onboardingMap = new Map((onboardingData || []).map((o: any) => [o.user_id, o.time_vs_money]));

      const { data: profiles } = await supabase.from("profiles").select("id, display_name, created_at").in("id", allStudentIds);
      const detailMap = new Map((allDetails || []).map((d: any) => [d.student_id, d]));

      const rows: StudentRow[] = allStudentIds.map(id => {
        const profile = (profiles || []).find((p: any) => p.id === id);
        const detail = detailMap.get(id);
        const answer = onboardingMap.get(id);
        return {
          id,
          name: profile?.display_name || "—",
          email: detail?.email || "—",
          phone: detail?.phone || "—",
          courses: Array.from(studentCourses.get(id) || []),
          totalProgress: progressMap.get(id) || 0,
          onboardingAnswer: answer === "more_time" ? "הרבה זמן" : answer === "more_money" ? "הרבה כסף" : null,
          joinDate: profile?.created_at || null,
        };
      });

      setStudents(rows);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let result = students.filter(s => {
      // Search
      if (search) {
        const q = search.toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q)) return false;
      }
      // Progress filter
      if (progressFilter === "not_started" && s.totalProgress !== 0) return false;
      if (progressFilter === "in_progress" && (s.totalProgress <= 0 || s.totalProgress >= 100)) return false;
      if (progressFilter === "completed" && s.totalProgress !== 100) return false;
      // Date filter
      if (dateFilter !== "all" && s.joinDate) {
        const jd = new Date(s.joinDate);
        if (dateFilter === "week" && jd < weekAgo) return false;
        if (dateFilter === "month" && jd < monthAgo) return false;
        if (dateFilter === "older" && jd >= monthAgo) return false;
      }
      if (dateFilter !== "all" && !s.joinDate) return false;
      return true;
    });

    // Sort
    result.sort((a, b) => {
      if (sortOption === "name_asc") return a.name.localeCompare(b.name, "he");
      if (sortOption === "progress_desc") return b.totalProgress - a.totalProgress;
      if (sortOption === "date_desc") return (b.joinDate || "").localeCompare(a.joinDate || "");
      return 0;
    });

    return result;
  }, [students, search, progressFilter, dateFilter, sortOption]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#ffbd02", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const selectTriggerStyle = "font-outfit text-xs h-9 bg-white/[0.04] border-white/10 text-white hover:bg-white/[0.07] focus:ring-0 focus:ring-offset-0";
  const selectContentStyle = { background: "#242424", border: "1px solid rgba(255,255,255,0.1)" };

  return (
    <div className="h-full overflow-auto p-4 sm:p-6 space-y-4 scrollbar-thin">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-outfit">ניהול תלמידים</h1>
        <p className="text-sm mt-1" style={{ color: "#888" }}>{students.length} תלמידים עם גישה לקורסים</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Search */}
        <div className="relative w-full sm:w-56">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#666" }} />
          <Input
            placeholder="חפש לפי שם או אימייל..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9 font-outfit text-xs h-9"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
          />
        </div>

        {/* Progress filter */}
        <Select value={progressFilter} onValueChange={(v) => setProgressFilter(v as ProgressFilter)}>
          <SelectTrigger className={`w-full sm:w-44 ${selectTriggerStyle}`}>
            <div className="flex items-center gap-1.5">
              <Filter className="w-3 h-3" style={{ color: "#ffbd02" }} />
              <SelectValue placeholder="סינון לפי התקדמות" />
            </div>
          </SelectTrigger>
          <SelectContent style={selectContentStyle}>
            <SelectItem value="all" className="text-xs font-outfit">הכל</SelectItem>
            <SelectItem value="not_started" className="text-xs font-outfit">לא התחיל (0%)</SelectItem>
            <SelectItem value="in_progress" className="text-xs font-outfit">בתהליך (1%–99%)</SelectItem>
            <SelectItem value="completed" className="text-xs font-outfit">סיים (100%)</SelectItem>
          </SelectContent>
        </Select>

        {/* Date filter */}
        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
          <SelectTrigger className={`w-full sm:w-40 ${selectTriggerStyle}`}>
            <div className="flex items-center gap-1.5">
              <Filter className="w-3 h-3" style={{ color: "#ffbd02" }} />
              <SelectValue placeholder="תאריך הצטרפות" />
            </div>
          </SelectTrigger>
          <SelectContent style={selectContentStyle}>
            <SelectItem value="all" className="text-xs font-outfit">הכל</SelectItem>
            <SelectItem value="week" className="text-xs font-outfit">השבוע</SelectItem>
            <SelectItem value="month" className="text-xs font-outfit">החודש</SelectItem>
            <SelectItem value="older" className="text-xs font-outfit">לפני כן</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
          <SelectTrigger className={`w-full sm:w-48 ${selectTriggerStyle}`}>
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3 h-3" style={{ color: "#ffbd02" }} />
              <SelectValue placeholder="מיין לפי" />
            </div>
          </SelectTrigger>
          <SelectContent style={selectContentStyle}>
            <SelectItem value="name_asc" className="text-xs font-outfit">שם (א-ת)</SelectItem>
            <SelectItem value="progress_desc" className="text-xs font-outfit">התקדמות (גבוה לנמוך)</SelectItem>
            <SelectItem value="date_desc" className="text-xs font-outfit">תאריך הצטרפות (חדש לישן)</SelectItem>
          </SelectContent>
        </Select>

        {/* Count */}
        <div className="mr-auto">
          <span className="text-xs font-outfit" style={{ color: "#888" }}>
            מציג {filtered.length} תלמידים
          </span>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Users className="w-12 h-12 mx-auto" style={{ color: "#555" }} />
          <p style={{ color: "#888" }}>{search || progressFilter !== "all" || dateFilter !== "all" ? "לא נמצאו תלמידים" : "אין תלמידים עם גישה לקורסים"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <div
              key={s.id}
              onClick={() => setSelectedStudentId(s.id)}
              className="flex items-center gap-4 p-4 rounded-xl transition-colors cursor-pointer hover:!bg-white/[0.06]"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "linear-gradient(135deg, #ffbd02, #e6a800)", color: "rgb(36,36,34)" }}>
                {s.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate font-outfit">{s.name}</p>
                <p className="text-xs" style={{ color: "#888" }}>{s.email}{s.phone && s.phone !== "—" ? ` · ${s.phone}` : ""}</p>
                {(() => {
                  const badges: { label: string; type: "course" | "onboarding" | "other" }[] = [];
                  s.courses.forEach(c => badges.push({ label: c, type: "course" }));
                  if (s.onboardingAnswer) badges.push({ label: s.onboardingAnswer, type: "onboarding" });
                  if (badges.length === 0) return null;
                  const visible = badges.slice(0, 3);
                  const extra = badges.length - 3;
                  const colors = { course: { border: "#00C896", color: "#00C896", bg: "rgba(0,200,150,0.08)" }, onboarding: { border: "#7C6EFF", color: "#7C6EFF", bg: "rgba(124,110,255,0.08)" }, other: { border: "#FFD700", color: "#FFD700", bg: "rgba(255,215,0,0.08)" } };
                  return (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {visible.map((b, i) => {
                        const c = colors[b.type];
                        return <span key={i} className="inline-block truncate" style={{ border: `1px solid ${c.border}`, color: c.color, background: c.bg, borderRadius: 6, fontSize: 11, fontWeight: 600, padding: "3px 10px", maxWidth: 160 }}>{b.label}</span>;
                      })}
                      {extra > 0 && <span className="inline-block" style={{ border: "1px solid #555", color: "#888", background: "transparent", borderRadius: 6, fontSize: 11, fontWeight: 600, padding: "3px 10px" }}>+{extra} נוספים</span>}
                    </div>
                  );
                })()}
              </div>
              <div className="w-24 hidden md:block">
                <Progress value={s.totalProgress} className="h-1.5" />
                <p className="text-[10px] mt-1" style={{ color: "#666" }}>{s.totalProgress}% הושלם</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <AcademyStudentDrawer
        studentId={selectedStudentId}
        open={!!selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
      />
    </div>
  );
}
