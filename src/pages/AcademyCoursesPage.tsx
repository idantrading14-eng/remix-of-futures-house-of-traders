import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, BookOpen, Users, Clock, MoreVertical, Copy, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AcademyCourseDetail from "@/components/academy/AcademyCourseDetail";
import AcademyAddCourseModal from "@/components/academy/AcademyAddCourseModal";

type Course = {
  id: string; title: string; description: string; thumbnail_url: string | null;
  type: string; price: number; visibility: string; enrollment_type: string;
  certificate_enabled: boolean; created_at: string; updated_at: string;
  module_count?: number; lesson_count?: number; total_duration?: number;
  student_count?: number; avg_progress?: number;
};

const TYPE_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  basic: { label: "בסיסי", bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
  pro: { label: "PRO", bg: "rgba(255,189,2,0.15)", text: "#ffbd02" },
  done_for_you: { label: "Done-for-you", bg: "rgba(16,185,129,0.15)", text: "#10b981" },
};

export default function AcademyCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchCourses = async () => {
    setLoading(true);
    const { data: coursesData, error } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
    if (error) { toast.error("שגיאה בטעינת קורסים"); setLoading(false); return; }

    const enriched = await Promise.all(
      (coursesData || []).map(async (course: any) => {
        const { count: moduleCount } = await supabase.from("modules").select("*", { count: "exact", head: true }).eq("course_id", course.id);
        const { data: modules } = await supabase.from("modules").select("id").eq("course_id", course.id);
        const moduleIds = (modules || []).map((m: any) => m.id);
        let lessonCount = 0, totalDuration = 0;
        if (moduleIds.length > 0) {
          const { data: lessons } = await supabase.from("lessons").select("duration_minutes").in("module_id", moduleIds);
          lessonCount = lessons?.length || 0;
          totalDuration = (lessons || []).reduce((s: number, l: any) => s + (l.duration_minutes || 0), 0);
        }
        // Count enrolled students
        const { count: enrolledCount } = await supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("course_id", course.id);
        
        // Count students with product-based access (via external_id)
        let productAccessCount = 0;
        if (course.external_id) {
          const { data: clientsWithProduct } = await supabase
            .from("client_details")
            .select("student_id, product_ids");
          if (clientsWithProduct) {
            const productStudentIds = clientsWithProduct
              .filter((cd: any) => {
                const pids = cd.product_ids;
                return Array.isArray(pids) && pids.includes(course.external_id);
              })
              .map((cd: any) => cd.student_id);
            
            // Get enrolled student IDs to avoid double-counting
            const { data: enrolledStudents } = await supabase
              .from("enrollments")
              .select("client_id")
              .eq("course_id", course.id);
            const enrolledIds = new Set((enrolledStudents || []).map((e: any) => e.client_id));
            productAccessCount = productStudentIds.filter((id: string) => !enrolledIds.has(id)).length;
          }
        }
        
        const totalStudents = (enrolledCount || 0) + productAccessCount;
        return { ...course, module_count: moduleCount || 0, lesson_count: lessonCount, total_duration: totalDuration, student_count: totalStudents, avg_progress: 0 };
      })
    );
    setCourses(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchCourses(); }, []);

  const deleteCourse = async (id: string) => {
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) { toast.error("שגיאה במחיקת הקורס"); return; }
    toast.success("הקורס נמחק");
    fetchCourses();
  };

  const duplicateCourse = async (course: Course) => {
    const { error } = await supabase.from("courses").insert({
      title: course.title + " (עותק)", description: course.description,
      thumbnail_url: course.thumbnail_url, type: course.type, price: course.price,
      visibility: "draft", enrollment_type: course.enrollment_type, certificate_enabled: course.certificate_enabled,
    });
    if (error) { toast.error("שגיאה בשכפול"); return; }
    toast.success("הקורס שוכפל");
    fetchCourses();
  };

  const filtered = courses.filter((c) => {
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== "all" && c.type !== typeFilter) return false;
    return true;
  });

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} דק׳`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m > 0 ? `${h} שע׳ ${m} דק׳` : `${h} שע׳`;
  };

  if (selectedCourseId) {
    return <AcademyCourseDetail courseId={selectedCourseId} onBack={() => { setSelectedCourseId(null); fetchCourses(); }} />;
  }

  return (
    <div className="h-full overflow-auto p-4 sm:p-6 space-y-6 scrollbar-thin">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-outfit">ניהול קורסים</h1>
          <p className="text-sm mt-1" style={{ color: "#888" }}>צור, ערוך ונהל את כל הקורסים שלך</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#666" }} />
            <Input
              placeholder="חיפוש קורס..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 sm:w-56 font-outfit"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-xl text-sm px-3 outline-none font-outfit"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
          >
            <option value="all">הכל</option>
            <option value="basic">בסיסי</option>
            <option value="pro">PRO</option>
            <option value="done_for_you">Done-for-you</option>
          </select>
          <Button
            onClick={() => setShowAddModal(true)}
            className="shrink-0 font-outfit font-semibold"
            style={{ background: "#ffbd02", color: "rgb(36,36,34)" }}
          >
            <Plus className="w-4 h-4 ml-1.5" />
            קורס חדש
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "סה״כ קורסים", value: courses.length, icon: BookOpen },
          { label: "מודולים", value: courses.reduce((s, c) => s + (c.module_count || 0), 0), icon: BookOpen },
          { label: "שיעורים", value: courses.reduce((s, c) => s + (c.lesson_count || 0), 0), icon: Clock },
          { label: "תלמידים", value: courses.reduce((s, c) => s + (c.student_count || 0), 0), icon: Users },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-xl" style={{ background: "rgb(45,45,43)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <stat.icon className="w-5 h-5 mb-2" style={{ color: "#ffbd02" }} />
            <p className="text-2xl font-bold font-outfit">{stat.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "#888" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Course grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#ffbd02", borderTopColor: "transparent" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <BookOpen className="w-12 h-12 mx-auto" style={{ color: "#555" }} />
          <p style={{ color: "#888" }}>אין קורסים עדיין</p>
          <Button onClick={() => setShowAddModal(true)} variant="outline" style={{ borderColor: "rgba(255,255,255,0.1)", color: "#ccc", background: "rgba(255,255,255,0.06)" }}>
            <Plus className="w-4 h-4 ml-1.5" /> צור קורס ראשון
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((course) => {
            const typeInfo = TYPE_LABELS[course.type] || TYPE_LABELS.basic;
            return (
              <div
                key={course.id}
                className="group rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                style={{ background: "rgb(45,45,43)", border: "1px solid rgba(255,255,255,0.06)" }}
                onClick={() => setSelectedCourseId(course.id)}
              >
                {/* Thumbnail */}
                <div className="h-44 relative overflow-hidden" style={{ borderBottom: "2px solid #ffbd02" }}>
                  {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(255,189,2,0.1), rgba(255,189,2,0.02))" }}>
                      <BookOpen className="w-14 h-14" style={{ color: "rgba(255,189,2,0.3)" }} />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: typeInfo.bg, color: typeInfo.text }}>
                      {typeInfo.label}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                  <h3 className="font-bold text-lg leading-tight font-outfit group-hover:text-[#ffbd02] transition-colors">{course.title}</h3>
                  <div className="flex items-center gap-4 text-xs" style={{ color: "#888" }}>
                    <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{course.module_count} מודולים | {course.lesson_count} שיעורים</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatDuration(course.total_duration || 0)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: "#888" }}>
                    <Users className="w-3.5 h-3.5" />{course.student_count} תלמידים רשומים
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1 text-xs h-9 font-outfit font-semibold"
                      style={{ background: "#ffbd02", color: "rgb(36,36,34)" }}
                      onClick={(e) => { e.stopPropagation(); setSelectedCourseId(course.id); }}
                    >
                      ערוך קורס
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0" style={{ color: "#888" }}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" style={{ background: "rgb(45,45,43)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); duplicateCourse(course); }} style={{ color: "#ccc" }}>
                          <Copy className="w-4 h-4 ml-2" /> שכפל
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteCourse(course.id); }} style={{ color: "#f87171" }}>
                          <Trash2 className="w-4 h-4 ml-2" /> מחק
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <AcademyAddCourseModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchCourses(); }}
        />
      )}
    </div>
  );
}
