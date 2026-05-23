import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, BookOpen, Users, Clock, Award, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import CourseContentTab from "./CourseContentTab";
import CourseInfoTab from "./CourseInfoTab";
import CourseStudentsTab from "./CourseStudentsTab";
import CourseSettingsTab from "./CourseSettingsTab";

type Props = { courseId: string; onBack: () => void };

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  basic: { label: "בסיסי", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  pro: { label: "PRO", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  done_for_you: { label: "Done-for-you", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
};

const ALL_TABS = [
  { key: "content", label: "תוכן" },
  { key: "info", label: "מידע" },
  { key: "students", label: "תלמידים" },
  { key: "settings", label: "הגדרות" },
];

export default function CourseDetailView({ courseId, onBack }: Props) {
  const [course, setCourse] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("info");
  const [stats, setStats] = useState({ modules: 0, lessons: 0, duration: 0, students: 0 });
  const [loading, setLoading] = useState(true);

  const fetchCourse = async () => {
    const { data } = await supabase.from("courses").select("*").eq("id", courseId).single();
    if (data) setCourse(data);

    const { count: moduleCount } = await supabase.from("modules").select("*", { count: "exact", head: true }).eq("course_id", courseId);
    const { data: modules } = await supabase.from("modules").select("id").eq("course_id", courseId);
    const moduleIds = (modules || []).map((m: any) => m.id);
    let lessonCount = 0, totalDuration = 0;
    if (moduleIds.length > 0) {
      const { data: lessons } = await supabase.from("lessons").select("duration_minutes").in("module_id", moduleIds);
      lessonCount = lessons?.length || 0;
      totalDuration = (lessons || []).reduce((s: number, l: any) => s + (l.duration_minutes || 0), 0);
    }
    const { count: studentCount } = await supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("course_id", courseId);
    setStats({ modules: moduleCount || 0, lessons: lessonCount, duration: totalDuration, students: studentCount || 0 });
    setLoading(false);
  };

  useEffect(() => { fetchCourse(); }, [courseId]);

  if (loading || !course) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const typeInfo = TYPE_LABELS[course.type] || TYPE_LABELS.basic;
  const isVideoCourse = !course.content_type || course.content_type === "video";
  const TABS = isVideoCourse ? ALL_TABS : ALL_TABS.filter(t => t.key !== "content");
  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} דק׳`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h} שע׳ ${m} דק׳` : `${h} שע׳`;
  };

  return (
    <div className="h-full overflow-auto scrollbar-thin">
      {/* Header */}
      <div className="bg-gradient-to-l from-indigo-500/10 to-purple-600/10 border-b border-white/[0.06] p-4 sm:p-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors mb-4">
          <ArrowRight className="w-4 h-4" />
          חזרה לקורסים
        </button>
        <div className="flex flex-col sm:flex-row gap-5">
          {/* Thumbnail */}
          <div className="w-full sm:w-48 h-28 sm:h-32 rounded-xl overflow-hidden bg-white/[0.04] shrink-0" style={{ border: "2px solid #ffbd02" }}>
            {course.thumbnail_url ? (
              <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-indigo-400/40" />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-start gap-3">
              <h1 className="text-2xl font-bold text-white">{course.title}</h1>
              <Badge className={`${typeInfo.color} border text-xs shrink-0`}>{typeInfo.label}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" />{stats.modules} מודולים</span>
              <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" />{stats.lessons} שיעורים</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{formatDuration(stats.duration)}</span>
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{stats.students} תלמידים</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/[0.06] px-4 sm:px-6">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium transition-all relative ${
                activeTab === tab.key ? "text-indigo-400" : "text-gray-500 hover:text-white"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && <span className="absolute bottom-0 inset-x-2 h-0.5 rounded-full bg-indigo-400" />}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-4 sm:p-6">
        {activeTab === "content" && <CourseContentTab courseId={courseId} />}
        {activeTab === "info" && <CourseInfoTab course={course} onSaved={fetchCourse} />}
        {activeTab === "students" && <CourseStudentsTab courseId={courseId} />}
        {activeTab === "settings" && <CourseSettingsTab course={course} onSaved={fetchCourse} onDeleted={onBack} />}
      </div>
    </div>
  );
}
