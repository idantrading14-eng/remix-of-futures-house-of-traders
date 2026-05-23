import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Clock, Play, ChevronLeft, Lock } from "lucide-react";

type Course = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  external_id: string | null;
};

type LastLessonInfo = {
  lessonTitle: string;
  courseTitle: string;
  duration: number | null;
  lessonId: string;
  courseId: string;
};

interface Props {
  userId: string;
  displayName: string;
  onNavigate: (view: string) => void;
  hasCoursesAccess: boolean;
}

export default function DashboardView({ userId, displayName, onNavigate, hasCoursesAccess }: Props) {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [lastLesson, setLastLesson] = useState<LastLessonInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch all courses
      const { data: coursesData } = await supabase
        .from("courses")
        .select("id, title, description, thumbnail_url, external_id");
      const courses = (coursesData || []) as Course[];
      setAllCourses(courses);

      // Fetch student's product_ids from client_details
      const { data: details } = await supabase.from("client_details").select("product_ids").eq("student_id", userId).single();
      const productIds: string[] = Array.isArray((details as any)?.product_ids) ? (details as any).product_ids.map(String) : [];

      // Match courses by external_id
      const unlocked = new Set<string>();
      for (const course of courses) {
        if (course.external_id && productIds.includes(course.external_id)) {
          unlocked.add(course.id);
        }
      }
      setUnlockedIds(unlocked);

      // Calculate progress only for unlocked courses
      const unlockedCourseIds = Array.from(unlocked);
      if (unlockedCourseIds.length > 0) {
        const { data: allProgress } = await supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("client_id", userId)
          .eq("completed", true);

        const completedSet = new Set((allProgress || []).map((p) => p.lesson_id));

        const pMap: Record<string, number> = {};
        for (const cId of unlockedCourseIds) {
          const { data: mods } = await supabase.from("modules").select("id").eq("course_id", cId);
          if (!mods || mods.length === 0) { pMap[cId] = 0; continue; }
          const modIds = mods.map((m) => m.id);
          const { data: lessons } = await supabase.from("lessons").select("id").in("module_id", modIds);
          if (!lessons || lessons.length === 0) { pMap[cId] = 0; continue; }
          const completed = lessons.filter((l) => completedSet.has(l.id)).length;
          pMap[cId] = Math.round((completed / lessons.length) * 100);
        }
        setProgressMap(pMap);

        // Find last lesson progress
        if (allProgress && allProgress.length > 0) {
          const { data: lastProg } = await supabase
            .from("lesson_progress")
            .select("lesson_id")
            .eq("client_id", userId)
            .eq("completed", true)
            .order("completed_at", { ascending: false })
            .limit(1);
          if (lastProg && lastProg.length > 0) {
            const { data: lessonData } = await supabase
              .from("lessons")
              .select("id, title, duration_minutes, module_id")
              .eq("id", lastProg[0].lesson_id)
              .single();
            if (lessonData) {
              const { data: modData } = await supabase
                .from("modules")
                .select("course_id")
                .eq("id", lessonData.module_id)
                .single();
              if (modData) {
                const course = courses.find((c) => c.id === modData.course_id);
                setLastLesson({
                  lessonTitle: lessonData.title,
                  courseTitle: course?.title || "",
                  duration: lessonData.duration_minutes,
                  lessonId: lessonData.id,
                  courseId: modData.course_id,
                });
              }
            }
          }
        }
      }

      setLoading(false);
    };
    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "#d4a017", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  // Sort: unlocked first
  const sortedCourses = [...allCourses].sort((a, b) => {
    const aU = unlockedIds.has(a.id) ? 0 : 1;
    const bU = unlockedIds.has(b.id) ? 0 : 1;
    return aU - bU;
  });

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div
        className="relative rounded-2xl overflow-hidden p-8 md:p-10"
        style={{
          background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, #1f2a1f 100%)",
          border: "1px solid rgba(212, 160, 23, 0.15)",
        }}
      >
        <div
          className="absolute top-0 left-0 w-72 h-72 rounded-full blur-[100px] opacity-20"
          style={{ background: "#d4a017" }}
        />
        <div
          className="absolute bottom-0 right-0 w-48 h-48 rounded-full blur-[80px] opacity-10"
          style={{ background: "#2ecc71" }}
        />

        <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Discount Code Card - far left */}
          <div className="hidden md:flex items-center" style={{ marginLeft: 16, marginRight: 0 }}>
            <div className="relative flex flex-col items-center" style={{ width: 130 }}>
              {/* Badge above card */}
              <div
                className="px-2 py-0.5 rounded text-[10px] font-bold mb-1.5 tracking-wide"
                style={{ background: "#080808", color: "#B8860B", border: "1px solid #B8860B" }}
              >
                קוד בלעדי
              </div>
              {/* Card */}
              <div
                className="w-full rounded-lg flex flex-col items-center overflow-hidden animate-[pulse-border_2s_ease-in-out_infinite] backdrop-blur-xl"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.06) 100%)",
                  border: "1px solid #B8860B",
                  boxShadow: "0 0 8px rgba(184,134,11,0.15), inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -1px 1px rgba(0,0,0,0.2)",
                }}
              >
                {/* Top gold line */}
                <div className="w-full h-[2px]" style={{ background: "#B8860B" }} />
                <div className="flex flex-col items-center py-3 px-3 gap-1.5 w-full">
                  <span className="text-[11px] text-center leading-tight" style={{ color: "#888" }}>
                    קוד הנחה מקסימלי לחברת <span className="font-bold" style={{ color: "#B8860B" }}>APEX</span>
                  </span>
                  <span className="text-2xl font-bold text-white tracking-wide mt-0.5">IDO</span>
                  <div className="h-[2px] rounded-full" style={{ width: 54, background: "#B8860B" }} />
                  
                </div>
                {/* Bottom gold line */}
                <div className="w-full h-[2px]" style={{ background: "#B8860B" }} />
              </div>
            </div>
          </div>

          <div className="flex-1">
            <h2 className="text-3xl md:text-4xl font-bold text-white font-outfit mb-2">
              !ברוך הבא, {displayName}
            </h2>
            <p className="text-base mb-6" style={{ color: "#aaa" }}>
              הפורטל האישי שלך
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate("courses")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
                style={{ background: "rgba(212, 160, 23, 0.15)", color: "#d4a017", border: "1px solid rgba(212, 160, 23, 0.3)" }}
              >
                <BookOpen className="w-4 h-4" />
                הקורסים שלי
              </button>
              <button
                onClick={() => onNavigate("bookmarks")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
                style={{ background: "rgba(255,255,255,0.05)", color: "#aaa", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                סימניות
              </button>
            </div>
          </div>

          <div className="hidden md:block">
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(212, 160, 23, 0.2), rgba(212, 160, 23, 0.05))",
                border: "2px solid rgba(212, 160, 23, 0.3)",
              }}
            >
              <span className="text-3xl font-bold font-outfit" style={{ color: "#d4a017" }}>F</span>
            </div>
          </div>
        </div>
      </div>

      {/* Last Lesson Widget */}
      {lastLesson && (
        <div
          className="rounded-2xl p-5 flex items-center gap-5 transition-all duration-200 hover:-translate-y-0.5"
          style={{ background: "#2a2a2a", border: "1px solid #3a3a3a" }}
        >
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(212, 160, 23, 0.12)" }}
          >
            <Play className="w-7 h-7" style={{ color: "#d4a017" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-1" style={{ color: "#d4a017" }}>
              שיעור אחרון
            </p>
            <p className="text-sm font-semibold text-white truncate">{lastLesson.lessonTitle}</p>
            {lastLesson.duration && (
              <div className="flex items-center gap-1.5 mt-1">
                <Clock className="w-3.5 h-3.5" style={{ color: "#777" }} />
                <span className="text-xs" style={{ color: "#777" }}>{lastLesson.duration} דקות</span>
              </div>
            )}
          </div>
          <button
            onClick={() => onNavigate("courses")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: "#2ecc71", color: "#111" }}
          >
            המשך
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* All Courses */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-6 rounded-full" style={{ background: "#d4a017" }} />
          <h3 className="text-lg font-bold text-white font-outfit">הקורסים</h3>
        </div>

        {sortedCourses.length === 0 ? (
          <div
            className="rounded-2xl p-10 flex flex-col items-center justify-center text-center"
            style={{ background: "#2a2a2a", border: "1px solid #3a3a3a" }}
          >
            <BookOpen className="w-10 h-10 mb-3" style={{ color: "rgba(212, 160, 23, 0.3)" }} />
            <p className="text-sm" style={{ color: "#777" }}>אין קורסים זמינים כרגע</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedCourses.map((course) => {
              const isUnlocked = unlockedIds.has(course.id);
              return (
                <button
                  key={course.id}
                  onClick={() => isUnlocked && onNavigate("courses")}
                  className={`group rounded-2xl overflow-hidden text-right transition-all duration-300 ${isUnlocked ? "hover:-translate-y-1 cursor-pointer" : "cursor-not-allowed"}`}
                  style={{
                    background: "#2a2a2a",
                    border: isUnlocked ? "1px solid #3a3a3a" : "1px solid rgba(255,255,255,0.04)",
                    opacity: isUnlocked ? 1 : 0.55,
                  }}
                >
                  {/* Thumbnail */}
                  <div className="w-full h-40 overflow-hidden relative" style={{ background: "#222" }}>
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-10 h-10" style={{ color: "rgba(212, 160, 23, 0.2)" }} />
                      </div>
                    )}
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #2a2a2a 0%, transparent 50%)" }} />
                    {!isUnlocked && (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                        <Lock className="w-8 h-8" style={{ color: "rgba(255,255,255,0.5)" }} />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h4 className="text-sm font-semibold text-white mb-3 line-clamp-2">{course.title}</h4>

                    {isUnlocked ? (
                      <>
                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${progressMap[course.id] || 0}%`, background: "#2ecc71" }}
                          />
                        </div>
                        <p className="text-xs mt-2 font-medium" style={{ color: "#2ecc71" }}>
                          {progressMap[course.id] || 0}% התקדמות
                        </p>
                      </>
                    ) : (
                      <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: "#888" }}>
                        <Lock className="w-3.5 h-3.5" />
                        קורס נעול
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
