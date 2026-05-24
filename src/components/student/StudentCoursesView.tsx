import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Play, CheckCircle2, Lock, FileText, Code } from "lucide-react";
import AcademyLessonViewer from "@/components/academy/AcademyLessonViewer";

type Course = { id: string; title: string; description: string | null; thumbnail_url: string | null; type: string; content_type?: string; pdf_url?: string | null; html_content?: string | null };
type Module = { id: string; title: string; sort_order: number; notes: string | null };
type Lesson = {
  id: string; title: string; sort_order: number; module_id: string; duration_minutes: number | null;
  video_source_type: string; content_type: string; video_url: string | null; video_file_url: string | null;
  embed_code: string | null; text_content: string | null; file_url: string | null;
  access_level: string; description: string | null; thumbnail_url: string | null;
};

function PdfViewer({ url, onBack, title }: { url: string; onBack: () => void; title: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={onBack} className="text-sm hover:text-white transition-colors" style={{ color: "#888" }}>← חזרה לקורסים</button>
        <h2 className="text-lg font-bold text-white font-outfit">{title}</h2>
      </div>
      <div className="flex-1 p-4">
        <iframe src={url} className="w-full rounded-xl" style={{ height: "calc(100vh - 200px)", border: "1px solid rgba(255,255,255,0.08)" }} />
      </div>
    </div>
  );
}

function HtmlViewer({ html, onBack, title }: { html: string; onBack: () => void; title: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const adjustHeight = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc?.body) {
          const height = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight);
          iframe.style.height = height + "px";
        }
      } catch { /* cross-origin fallback */ }
    };

    const resizeObserver = new ResizeObserver(adjustHeight);

    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc?.body) {
          adjustHeight();
          resizeObserver.observe(doc.body);
          resizeObserver.observe(doc.documentElement);
        }
      } catch { /* fallback */ }
    };
    iframe.addEventListener("load", handleLoad);
    return () => {
      iframe.removeEventListener("load", handleLoad);
      resizeObserver.disconnect();
    };
  }, [html]);

  // Inject base target + body reset styles
  const resetStyles = `<style>html, body { margin: 0; padding: 0; height: auto; min-height: auto; overflow: hidden; }</style>`;
  const finalHtml = html.includes("<head")
    ? html.replace(/<head([^>]*)>/i, `<head$1><base target="_blank">${resetStyles}`)
    : `<html><head><base target="_blank">${resetStyles}</head><body>${html}</body></html>`;

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={onBack} className="text-sm hover:text-white transition-colors" style={{ color: "#888" }}>← חזרה לקורסים</button>
        <h2 className="text-lg font-bold text-white font-outfit">{title}</h2>
      </div>
      <div className="flex-1 p-4">
        <iframe
          ref={iframeRef}
          srcDoc={finalHtml}
          className="w-full rounded-xl"
          style={{ minHeight: 500, border: "none", overflow: "hidden", background: "#fff" }}
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    </div>
  );
}

export default function StudentCoursesView({ userId }: { userId: string }) {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [courseProgress, setCourseProgress] = useState<Record<string, { completed: number; total: number }>>({});
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [viewingLesson, setViewingLesson] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProgress = async (courses: Course[], unlocked: Set<string>) => {
    const progress: Record<string, { completed: number; total: number }> = {};
    for (const course of courses) {
      if (!unlocked.has(course.id)) continue;
      if (course.content_type && course.content_type !== "video") continue; // no progress for PDF/HTML
      const { data: mods } = await supabase.from("modules").select("id").eq("course_id", course.id);
      const modIds = (mods || []).map((m: any) => m.id);
      if (modIds.length === 0) { progress[course.id] = { completed: 0, total: 0 }; continue; }
      const { data: lsns } = await supabase.from("lessons").select("id").in("module_id", modIds);
      const lessonIds = (lsns || []).map((l: any) => l.id);
      if (lessonIds.length === 0) { progress[course.id] = { completed: 0, total: 0 }; continue; }
      const { data: prog } = await supabase.from("lesson_progress").select("lesson_id").eq("client_id", userId).eq("completed", true).in("lesson_id", lessonIds);
      progress[course.id] = { completed: (prog || []).length, total: lessonIds.length };
    }
    setCourseProgress(progress);
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: coursesData } = await supabase.from("courses").select("*");
      const courses = (coursesData || []) as unknown as Course[];
      setAllCourses(courses);

      const { data: enrollments } = await supabase.from("enrollments").select("course_id").eq("client_id", userId);
      const unlocked = new Set<string>();
      for (const enrollment of (enrollments || [])) unlocked.add(enrollment.course_id);
      setUnlockedIds(unlocked);
      await fetchProgress(courses, unlocked);
      setLoading(false);
    };
    fetchData();
  }, [userId]);

  const openCourse = async (courseId: string) => {
    if (!unlockedIds.has(courseId)) return;
    const course = allCourses.find(c => c.id === courseId);
    // For PDF/HTML courses, just set selectedCourse — no modules/lessons needed
    if (course?.content_type === "pdf" || course?.content_type === "html") {
      setSelectedCourse(courseId);
      return;
    }
    setSelectedCourse(courseId);
    const { data: mods } = await supabase.from("modules").select("*").eq("course_id", courseId).order("sort_order");
    setModules((mods || []) as Module[]);
    const modIds = (mods || []).map((m: any) => m.id);
    if (modIds.length > 0) {
      const { data: lsns } = await supabase.from("lessons").select("*").in("module_id", modIds).order("sort_order");
      setLessons((lsns || []) as Lesson[]);
      const { data: progress } = await supabase.from("lesson_progress").select("lesson_id").eq("client_id", userId).eq("completed", true);
      setCompletedLessons(new Set((progress || []).map((p: any) => p.lesson_id)));
    }
  };

  if (viewingLesson) {
    const lesson = lessons.find(l => l.id === viewingLesson);
    if (!lesson) { setViewingLesson(null); return null; }
    const sortedAllLessons = [...lessons].sort((a, b) => {
      const modA = modules.find(m => m.id === a.module_id);
      const modB = modules.find(m => m.id === b.module_id);
      const modOrder = (modA?.sort_order ?? 0) - (modB?.sort_order ?? 0);
      return modOrder !== 0 ? modOrder : a.sort_order - b.sort_order;
    });
    return (
      <AcademyLessonViewer
        lesson={lesson as any}
        allLessons={sortedAllLessons as any[]}
        onBack={() => {
          setViewingLesson(null);
          const refreshCompleted = async () => {
            const lessonIds = lessons.map(l => l.id);
            if (lessonIds.length > 0) {
              const { data: progress } = await supabase.from("lesson_progress").select("lesson_id").eq("client_id", userId).eq("completed", true).in("lesson_id", lessonIds);
              setCompletedLessons(new Set((progress || []).map((p: any) => p.lesson_id)));
            }
          };
          refreshCompleted();
        }}
        onNavigate={(l) => setViewingLesson(l.id)}
      />
    );
  }

  if (selectedCourse) {
    const course = allCourses.find(c => c.id === selectedCourse);

    // PDF Viewer
    if (course?.content_type === "pdf" && course.pdf_url) {
      return <PdfViewer url={course.pdf_url} onBack={() => { setSelectedCourse(null); fetchProgress(allCourses, unlockedIds); }} title={course.title} />;
    }

    // HTML Viewer
    if (course?.content_type === "html" && course.html_content) {
      return <HtmlViewer html={course.html_content} onBack={() => { setSelectedCourse(null); fetchProgress(allCourses, unlockedIds); }} title={course.title} />;
    }

    // Video lessons (default)
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <button onClick={() => { setSelectedCourse(null); fetchProgress(allCourses, unlockedIds); }} className="text-sm mb-4 hover:text-white transition-colors" style={{ color: "#888" }}>
          ← חזרה לקורסים
        </button>
        <h2 className="text-xl font-bold text-white font-outfit mb-6">{course?.title}</h2>
        {modules.map(mod => {
          const modLessons = lessons.filter(l => l.module_id === mod.id);
          const completed = modLessons.filter(l => completedLessons.has(l.id)).length;
          return (
            <div key={mod.id} className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-white">{mod.title}</h3>
                <span className="text-xs" style={{ color: "#888" }}>{completed}/{modLessons.length}</span>
              </div>
              {mod.notes && (
                <div className="mb-3 p-3 rounded-xl" style={{ background: "rgba(255,189,2,0.06)", border: "1px solid rgba(255,189,2,0.15)" }}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#d4c08a" }}>{mod.notes}</p>
                </div>
              )}
              <div className="space-y-2">
                {modLessons.map(lesson => (
                  <button
                    key={lesson.id}
                    onClick={() => setViewingLesson(lesson.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/[0.06] text-right"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    {completedLessons.has(lesson.id)
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      : <Play className="w-5 h-5 shrink-0" style={{ color: "#ffbd02" }} />
                    }
                    <span className="flex-1 text-sm text-white">{lesson.title}</span>
                    {lesson.duration_minutes && (
                      <span className="text-xs" style={{ color: "#666" }}>{lesson.duration_minutes} דק׳</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {modules.length === 0 && (
          <p className="text-center py-10" style={{ color: "#666" }}>אין תוכן בקורס זה עדיין</p>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#ffbd02", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const sortedCourses = [...allCourses].sort((a, b) => {
    const aUnlocked = unlockedIds.has(a.id) ? 0 : 1;
    const bUnlocked = unlockedIds.has(b.id) ? 0 : 1;
    return aUnlocked - bUnlocked;
  });

  const getContentIcon = (ct?: string) => {
    if (ct === "pdf") return <FileText className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />;
    if (ct === "html") return <Code className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} />;
    return null;
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-white font-outfit mb-6">קורסים</h2>
      {sortedCourses.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 mx-auto mb-3" style={{ color: "rgba(255,189,2,0.3)" }} />
          <p style={{ color: "#888" }}>אין קורסים זמינים כרגע</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sortedCourses.map(course => {
            const isUnlocked = unlockedIds.has(course.id);
            const isVideo = !course.content_type || course.content_type === "video";
            return (
              <button
                key={course.id}
                onClick={() => isUnlocked && openCourse(course.id)}
                className={`flex items-center gap-4 p-4 rounded-xl text-right transition-all ${isUnlocked ? "hover:-translate-y-0.5 cursor-pointer" : "cursor-not-allowed"}`}
                style={{
                  background: isUnlocked ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
                  border: isUnlocked ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.04)",
                  opacity: isUnlocked ? 1 : 0.6,
                }}
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 relative" style={{ background: "rgba(255,255,255,0.06)" }}>
                  {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-6 h-6" style={{ color: "rgba(255,189,2,0.3)" }} />
                    </div>
                  )}
                  {!isUnlocked && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl" style={{ background: "rgba(0,0,0,0.6)" }}>
                      <Lock className="w-5 h-5" style={{ color: "rgba(255,255,255,0.5)" }} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-white">{course.title}</h3>
                    {getContentIcon(course.content_type)}
                  </div>
                  {course.description && <p className="text-xs mt-1" style={{ color: "#888" }}>{course.description.slice(0, 80)}</p>}
                  {isUnlocked && isVideo && courseProgress[course.id] && courseProgress[course.id].total > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px]" style={{ color: "#888" }}>
                          {courseProgress[course.id].completed}/{courseProgress[course.id].total} שיעורים
                        </span>
                        <span className="text-[10px] font-semibold" style={{ color: courseProgress[course.id].completed === courseProgress[course.id].total ? "#10b981" : "#ffbd02" }}>
                          {Math.round((courseProgress[course.id].completed / courseProgress[course.id].total) * 100)}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(courseProgress[course.id].completed / courseProgress[course.id].total) * 100}%`,
                            background: courseProgress[course.id].completed === courseProgress[course.id].total ? "#10b981" : "#ffbd02",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                {!isUnlocked && (
                  <Lock className="w-5 h-5 shrink-0" style={{ color: "rgba(255,189,2,0.4)" }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
