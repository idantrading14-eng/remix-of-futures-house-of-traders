import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, BookOpen, Users, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AcademyContentTab from "./AcademyContentTab";
import AcademyInfoTab from "./AcademyInfoTab";
import AcademySettingsTab from "./AcademySettingsTab";

type Props = { courseId: string; onBack: () => void };

const TYPE_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  basic: { label: "בסיסי", bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
  pro: { label: "PRO", bg: "rgba(255,189,2,0.15)", text: "#ffbd02" },
  done_for_you: { label: "Done-for-you", bg: "rgba(16,185,129,0.15)", text: "#10b981" },
};

const ALL_TABS = [
  { key: "content", label: "תוכן" },
  { key: "info", label: "מידע" },
  { key: "settings", label: "הגדרות" },
];

export default function AcademyCourseDetail({ courseId, onBack }: Props) {
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
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#ffbd02", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const typeInfo = TYPE_LABELS[course.type] || TYPE_LABELS.basic;
  const isVideoCourse = !course.content_type || course.content_type === "video";
  const TABS = isVideoCourse ? ALL_TABS : ALL_TABS.filter(t => t.key !== "content");
  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} דק׳`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m > 0 ? `${h} שע׳ ${m} דק׳` : `${h} שע׳`;
  };

  return (
    <div className="h-full overflow-auto scrollbar-thin">
      {/* Header */}
      <div className="p-4 sm:p-6" style={{ background: "linear-gradient(135deg, rgba(255,189,2,0.08), rgba(255,189,2,0.02))", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm transition-colors mb-4 hover:text-white" style={{ color: "#888" }}>
          <ArrowRight className="w-4 h-4" /> חזרה לקורסים
        </button>
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="w-full sm:w-48 h-28 sm:h-32 rounded-xl overflow-hidden shrink-0" style={{ border: "2px solid #ffbd02", background: "rgba(255,255,255,0.04)" }}>
            {course.thumbnail_url ? (
              <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="w-10 h-10" style={{ color: "rgba(255,189,2,0.3)" }} />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-start gap-3">
              <h1 className="text-2xl font-bold font-outfit">{course.title}</h1>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold shrink-0" style={{ background: typeInfo.bg, color: typeInfo.text }}>
                {typeInfo.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: "#b8b8b8" }}>
              <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" />{stats.modules} מודולים</span>
              <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" />{stats.lessons} שיעורים</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{formatDuration(stats.duration)}</span>
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{stats.students} תלמידים</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-4 py-3 text-sm font-medium transition-all relative font-outfit"
              style={{ color: activeTab === tab.key ? "#ffbd02" : "#888" }}
            >
              {tab.label}
              {activeTab === tab.key && <span className="absolute bottom-0 inset-x-2 h-0.5 rounded-full" style={{ background: "#ffbd02" }} />}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-4 sm:p-6">
        {activeTab === "content" && <AcademyContentTab courseId={courseId} />}
        {activeTab === "info" && <AcademyInfoTab course={course} onSaved={fetchCourse} />}
        {activeTab === "settings" && <AcademySettingsTab course={course} onSaved={fetchCourse} onDeleted={onBack} />}
      </div>
    </div>
  );
}
