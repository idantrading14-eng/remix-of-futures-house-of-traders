import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, BookOpen, Users, Clock, MoreVertical, Copy, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CourseDetailView from "@/components/courses/CourseDetailView";
import AddCourseModal from "@/components/courses/AddCourseModal";

type Course = {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  type: string;
  price: number;
  visibility: string;
  enrollment_type: string;
  certificate_enabled: boolean;
  created_at: string;
  updated_at: string;
  module_count?: number;
  lesson_count?: number;
  total_duration?: number;
  student_count?: number;
  avg_progress?: number;
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  basic: { label: "בסיסי", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  pro: { label: "PRO", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  done_for_you: { label: "Done-for-you", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
};

export default function CoursesPage({ embedded }: { embedded?: boolean }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
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
        let lessonCount = 0;
        let totalDuration = 0;
        if (moduleIds.length > 0) {
          const { data: lessons } = await supabase.from("lessons").select("duration_minutes").in("module_id", moduleIds);
          lessonCount = lessons?.length || 0;
          totalDuration = (lessons || []).reduce((sum: number, l: any) => sum + (l.duration_minutes || 0), 0);
        }
        const { count: studentCount } = await supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("course_id", course.id);
        return {
          ...course,
          module_count: moduleCount || 0,
          lesson_count: lessonCount,
          total_duration: totalDuration,
          student_count: studentCount || 0,
          avg_progress: 0,
        };
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
      title: course.title + " (עותק)",
      description: course.description,
      thumbnail_url: course.thumbnail_url,
      type: course.type,
      price: course.price,
      visibility: "draft",
      enrollment_type: course.enrollment_type,
      certificate_enabled: course.certificate_enabled,
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

  if (selectedCourseId) {
    return (
      <CourseDetailView
        courseId={selectedCourseId}
        onBack={() => { setSelectedCourseId(null); fetchCourses(); }}
      />
    );
  }

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} דק׳`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h} שע׳ ${m} דק׳` : `${h} שע׳`;
  };

  return (
    <div className="h-full overflow-auto p-4 sm:p-6 space-y-6 scrollbar-thin">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-white">קורסים</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="חיפוש קורס..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 bg-white/[0.04] border-white/10 text-white placeholder:text-gray-600 sm:w-56"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm px-3 outline-none"
          >
            <option value="all">הכל</option>
            <option value="basic">בסיסי</option>
            <option value="pro">PRO</option>
            <option value="done_for_you">Done-for-you</option>
          </select>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/25 shrink-0"
          >
            <Plus className="w-4 h-4 ml-1.5" />
            קורס חדש
          </Button>
        </div>
      </div>

      {/* Course grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <BookOpen className="w-12 h-12 text-gray-600 mx-auto" />
          <p className="text-gray-500">אין קורסים עדיין</p>
          <Button onClick={() => setShowAddModal(true)} variant="outline" className="border-white/10 text-white hover:bg-white/[0.04]">
            <Plus className="w-4 h-4 ml-1.5" />
            צור קורס ראשון
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((course) => {
            const typeInfo = TYPE_LABELS[course.type] || TYPE_LABELS.basic;
            return (
              <div
                key={course.id}
                className="group bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden hover:border-white/[0.15] transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedCourseId(course.id)}
              >
                {/* Thumbnail */}
                <div className="h-40 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 relative overflow-hidden" style={{ borderBottom: "2px solid #ffbd02" }}>
                  {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-indigo-400/40" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <Badge className={`${typeInfo.color} border text-xs`}>{typeInfo.label}</Badge>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <h3 className="text-white font-bold text-lg leading-tight group-hover:text-indigo-400 transition-colors">
                    {course.title}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      {course.module_count} מודולים | {course.lesson_count} שיעורים
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDuration(course.total_duration || 0)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Users className="w-3.5 h-3.5" />
                    {course.student_count} תלמידים רשומים
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-gray-600">
                      <span>התקדמות ממוצעת</span>
                      <span>{course.avg_progress}%</span>
                    </div>
                    <Progress value={course.avg_progress} className="h-1.5" />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-white/10 text-white hover:bg-white/[0.06] text-xs h-8"
                      onClick={(e) => { e.stopPropagation(); setSelectedCourseId(course.id); }}
                    >
                      צפה בקורס
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 text-xs h-8"
                      onClick={(e) => { e.stopPropagation(); setSelectedCourseId(course.id); }}
                    >
                      ערוך קורס
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-white">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#1a1a2e] border-white/10">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); duplicateCourse(course); }} className="text-gray-300 hover:text-white">
                          <Copy className="w-4 h-4 ml-2" /> שכפל
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteCourse(course.id); }} className="text-red-400 hover:text-red-300">
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
        <AddCourseModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchCourses(); }}
        />
      )}
    </div>
  );
}
