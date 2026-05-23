import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, CheckCircle2, ChevronRight, ChevronLeft, Play, Bookmark, Check, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

type Lesson = {
  id: string; module_id: string; title: string; content_type: string;
  video_source_type: string; video_url: string | null; video_file_url: string | null;
  embed_code: string | null; text_content: string | null; file_url: string | null;
  duration_minutes: number; access_level: string; sort_order: number;
  description: string | null; thumbnail_url: string | null;
};

type Props = {
  lesson: Lesson;
  allLessons: Lesson[];
  onBack: () => void;
  onNavigate: (lesson: Lesson) => void;
  onEdit?: (lesson: Lesson) => void;
};

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

function getEmbedUrl(url: string): string | null {
  const ytId = getYouTubeId(url);
  if (ytId) return `https://www.youtube.com/embed/${ytId}`;
  const vimeoId = getVimeoId(url);
  if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}`;
  return null;
}

export default function AcademyLessonViewer({ lesson, allLessons, onBack, onNavigate, onEdit }: Props) {
  const [completed, setCompleted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"notes" | "details">("notes");

  // Notes state
  const [noteContent, setNoteContent] = useState("");
  const [savedNote, setSavedNote] = useState<{ content: string; updated_at: string } | null>(null);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentIndex = allLessons.findIndex((l) => l.id === lesson.id);

  // Check completion + bookmark status for current lesson AND all lessons
  useEffect(() => {
    const checkStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [bookmarkRes, progressRes, allProgressRes] = await Promise.all([
        supabase.from("lesson_bookmarks").select("id").eq("user_id", user.id).eq("lesson_id", lesson.id).maybeSingle(),
        supabase.from("lesson_progress").select("completed").eq("client_id", user.id).eq("lesson_id", lesson.id).maybeSingle(),
        supabase.from("lesson_progress").select("lesson_id").eq("client_id", user.id).eq("completed", true).in("lesson_id", allLessons.map(l => l.id)),
      ]);
      setBookmarked(!!bookmarkRes.data);
      setCompleted(!!progressRes.data?.completed);
      setCompletedLessonIds(new Set((allProgressRes.data || []).map((r: any) => r.lesson_id)));
    };
    checkStatus();
  }, [lesson.id, allLessons]);

  // Load notes for current lesson
  useEffect(() => {
    setNoteContent("");
    setSavedNote(null);
    setNoteSaved(false);
    const loadNote = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("student_lesson_notes" as any)
        .select("content, updated_at")
        .eq("user_id", user.id)
        .eq("lesson_id", lesson.id)
        .maybeSingle();
      if (data) {
        setNoteContent((data as any).content || "");
        setSavedNote({ content: (data as any).content, updated_at: (data as any).updated_at });
      }
    };
    loadNote();
  }, [lesson.id]);

  const saveNote = useCallback(async (content: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setNoteSaving(true);
    const now = new Date().toISOString();
    await supabase.from("student_lesson_notes" as any).upsert(
      { user_id: user.id, lesson_id: lesson.id, content, updated_at: now } as any,
      { onConflict: "user_id,lesson_id" }
    );
    setSavedNote({ content, updated_at: now });
    setNoteSaving(false);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2500);
  }, [lesson.id]);

  const handleNoteChange = (val: string) => {
    setNoteContent(val);
    setNoteSaved(false);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => saveNote(val), 2000);
  };

  // Cleanup auto-save timer
  useEffect(() => {
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, []);

  const toggleBookmark = async () => {
    setBookmarkLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBookmarkLoading(false); return; }

    if (bookmarked) {
      await supabase.from("lesson_bookmarks").delete().eq("user_id", user.id).eq("lesson_id", lesson.id);
      setBookmarked(false);
      toast.success("הסימנייה הוסרה");
    } else {
      await supabase.from("lesson_bookmarks").insert({ user_id: user.id, lesson_id: lesson.id } as any);
      setBookmarked(true);
      toast.success("השיעור נשמר בסימניות ⭐");
    }
    setBookmarkLoading(false);
  };

  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const handleMarkComplete = async () => {
    setCompletionLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCompletionLoading(false); return; }

    if (completed) {
      await supabase.from("lesson_progress").delete().eq("client_id", user.id).eq("lesson_id", lesson.id);
      setCompleted(false);
      setCompletedLessonIds(prev => { const n = new Set(prev); n.delete(lesson.id); return n; });
      toast.success("סימון הושלם הוסר");
    } else {
      const { error } = await supabase.from("lesson_progress").upsert(
        { client_id: user.id, lesson_id: lesson.id, completed: true, completed_at: new Date().toISOString() },
        { onConflict: "client_id,lesson_id" }
      );
      if (error) {
        await supabase.from("lesson_progress").insert({
          client_id: user.id, lesson_id: lesson.id, completed: true, completed_at: new Date().toISOString()
        });
      }
      setCompleted(true);
      setCompletedLessonIds(prev => new Set(prev).add(lesson.id));
      toast.success("השיעור סומן כהושלם ✅");
    }
    setCompletionLoading(false);
  };

  const completionPercent = allLessons.length > 0 ? Math.round((completedLessonIds.size / allLessons.length) * 100) : 0;

  const renderVideoPlayer = () => {
    const sourceType = lesson.video_source_type || "url";

    if (sourceType === "url" && lesson.video_url) {
      const embedUrl = getEmbedUrl(lesson.video_url);
      if (embedUrl) {
        return (
          <div className="w-full aspect-video rounded-xl overflow-hidden" style={{ border: "2px solid rgba(255,189,2,0.3)" }}>
            <iframe src={embedUrl} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" style={{ border: "none" }} />
          </div>
        );
      }
      return (
        <div className="w-full aspect-video rounded-xl overflow-hidden" style={{ border: "2px solid rgba(255,189,2,0.3)" }}>
          <video src={lesson.video_url} controls className="w-full h-full object-contain" style={{ background: "#000" }} />
        </div>
      );
    }

    if (sourceType === "file" && lesson.video_file_url) {
      return (
        <div className="w-full aspect-video rounded-xl overflow-hidden" style={{ border: "2px solid rgba(255,189,2,0.3)" }}>
          <video src={lesson.video_file_url} controls className="w-full h-full object-contain" style={{ background: "#000" }} />
        </div>
      );
    }

    if (sourceType === "embed" && lesson.embed_code) {
      return (
        <div className="w-full aspect-video rounded-xl overflow-hidden" style={{ border: "2px solid rgba(255,189,2,0.3)" }}>
          <div className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-none" dangerouslySetInnerHTML={{ __html: lesson.embed_code }} />
        </div>
      );
    }

    if (lesson.video_url) {
      const embedUrl = getEmbedUrl(lesson.video_url);
      if (embedUrl) {
        return (
          <div className="w-full aspect-video rounded-xl overflow-hidden" style={{ border: "2px solid rgba(255,189,2,0.3)" }}>
            <iframe src={embedUrl} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" style={{ border: "none" }} />
          </div>
        );
      }
    }

    return (
      <div className="w-full aspect-video rounded-xl flex items-center justify-center" style={{ background: "rgb(30,30,28)", border: "2px solid rgba(255,255,255,0.06)" }}>
        <div className="text-center space-y-2">
          <Play className="w-12 h-12 mx-auto" style={{ color: "#555" }} />
          <p style={{ color: "#888" }}>אין וידאו זמין לשיעור זה</p>
        </div>
      </div>
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("he-IL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="h-full overflow-auto scrollbar-thin">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm transition-colors hover:text-white" style={{ color: "#888" }}>
          <ArrowRight className="w-4 h-4" /> חזרה למודולים
        </button>
        {onEdit && (
          <Button
            onClick={() => onEdit(lesson)}
            size="sm"
            className="font-outfit font-semibold"
            style={{ background: "rgba(212,160,23,0.15)", color: "#d4a017" }}
          >
            <Edit className="w-4 h-4 ml-1.5" />
            ערוך פרטי שיעור
          </Button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Main content */}
        <div className="flex-1 p-4 sm:p-6 space-y-5">
          {renderVideoPlayer()}

          {/* Nav buttons below video */}
          <div className="flex items-center justify-between">
            {prevLesson ? (
              <button
                onClick={() => onNavigate(prevLesson)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-outfit text-sm font-semibold transition-all hover:brightness-110"
                style={{ background: "rgba(212,160,23,0.15)", color: "#d4a017" }}
              >
                <ChevronRight className="w-4 h-4" />
                הקודם →
              </button>
            ) : <div />}
            {nextLesson ? (
              <button
                onClick={() => onNavigate(nextLesson)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-outfit text-sm font-semibold transition-all hover:brightness-110"
                style={{ background: "#d4a017", color: "#1a1a1a" }}
              >
                ← הבא
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : <div />}
          </div>

          {/* Actions row */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleMarkComplete}
              disabled={completionLoading}
              className="font-outfit font-semibold"
              style={{
                background: completed ? "#10b981" : "rgba(16,185,129,0.15)",
                color: completed ? "#fff" : "#10b981",
              }}
            >
              <CheckCircle2 className="w-4 h-4 ml-1.5" />
              {completionLoading ? "שומר..." : completed ? "הושלם ✅" : "סמן כהושלם"}
            </Button>

            <Button
              onClick={toggleBookmark}
              disabled={bookmarkLoading}
              className="font-outfit font-semibold"
              style={{
                background: bookmarked ? "rgba(212, 160, 23, 0.2)" : "rgba(255,255,255,0.06)",
                color: bookmarked ? "#d4a017" : "#888",
              }}
            >
              <Bookmark className="w-4 h-4 ml-1.5" fill={bookmarked ? "#d4a017" : "none"} />
              {bookmarked ? "שמור בסימניות" : "הוסף לסימניות"}
            </Button>
          </div>

          {/* Tabs */}
          <div className="pt-2">
            <div className="flex gap-1 mb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <button
                onClick={() => setActiveTab("notes")}
                className="px-4 py-2.5 text-sm font-outfit font-semibold transition-all relative"
                style={{
                  color: activeTab === "notes" ? "#d4a017" : "#888",
                  borderBottom: activeTab === "notes" ? "2px solid #d4a017" : "2px solid transparent",
                }}
              >
                הערות שלי 📝
              </button>
              <button
                onClick={() => setActiveTab("details")}
                className="px-4 py-2.5 text-sm font-outfit font-semibold transition-all relative"
                style={{
                  color: activeTab === "details" ? "#d4a017" : "#888",
                  borderBottom: activeTab === "details" ? "2px solid #d4a017" : "2px solid transparent",
                }}
              >
                פרטי השיעור ℹ️
              </button>
            </div>

            {activeTab === "notes" && (
              <div className="space-y-3">
                <div className="relative">
                  <textarea
                    value={noteContent}
                    onChange={(e) => handleNoteChange(e.target.value)}
                    placeholder="כתוב הערות לשיעור הזה..."
                    className="w-full min-h-[120px] p-3 rounded-xl text-sm font-outfit resize-y focus:outline-none focus:ring-1"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#e0e0e0",
                    }}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      {noteSaved && (
                        <span className="text-xs font-outfit flex items-center gap-1" style={{ color: "#10b981" }}>
                          <Check className="w-3 h-3" /> נשמר ✓
                        </span>
                      )}
                      {noteSaving && (
                        <span className="text-xs font-outfit" style={{ color: "#888" }}>שומר...</span>
                      )}
                    </div>
                    <Button
                      onClick={() => saveNote(noteContent)}
                      disabled={noteSaving}
                      className="font-outfit font-semibold text-xs h-8 px-4"
                      style={{ background: "#d4a017", color: "#1a1a1a" }}
                    >
                      שמור הערה
                    </Button>
                  </div>
                </div>

                {savedNote && savedNote.content && (
                  <div className="p-3 rounded-xl space-y-1" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-xs font-outfit" style={{ color: "#666" }}>
                      עודכן לאחרונה: {formatDate(savedNote.updated_at)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "details" && (
              <div className="space-y-3">
                <h1 className="text-2xl font-bold font-outfit">{lesson.title}</h1>
                {lesson.duration_minutes > 0 && (
                  <p className="text-sm" style={{ color: "#888" }}>⏱ {lesson.duration_minutes} דקות</p>
                )}
                {lesson.description && (
                  <p className="text-sm leading-relaxed" style={{ color: "#b8b8b8" }}>{lesson.description}</p>
                )}
                {lesson.text_content && (
                  <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#ccc" }}>{lesson.text_content}</p>
                  </div>
                )}
                {!lesson.description && !lesson.text_content && (
                  <p className="text-sm" style={{ color: "#666" }}>אין פרטים נוספים לשיעור זה</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: lesson list */}
        <div className="w-full lg:w-80 shrink-0 p-4 lg:pr-0" style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="mb-4 space-y-2.5">
            <h3 className="text-sm font-bold font-outfit" style={{ color: "#e0e0e0" }}>
              שיעור {currentIndex + 1} מתוך {allLessons.length}
            </h3>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-outfit" style={{ color: "#888" }}>התקדמות כללית</span>
                <span className="text-[11px] font-semibold font-outfit" style={{ color: "#10b981" }}>{completionPercent}%</span>
              </div>
              <Progress
                value={completionPercent}
                className="h-2 bg-[rgba(255,255,255,0.08)]"
                style={{ direction: "ltr" }}
              />
            </div>
          </div>

          <div className="space-y-1">
            {allLessons.map((l, idx) => {
              const isCurrent = l.id === lesson.id;
              const isCompleted = completedLessonIds.has(l.id);
              return (
                <button
                  key={l.id}
                  onClick={() => onNavigate(l)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-right transition-all text-sm"
                  style={{
                    background: isCurrent ? "rgba(212,160,23,0.18)" : "transparent",
                    color: isCurrent ? "#ffbd02" : "#b8b8b8",
                    borderRight: isCurrent ? "3px solid #d4a017" : "3px solid transparent",
                  }}
                >
                  {isCompleted ? (
                    <span className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center" style={{ background: "#10b981" }}>
                      <Check className="w-3 h-3 text-white" />
                    </span>
                  ) : (
                    <span className="text-xs w-5 h-5 shrink-0 flex items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: isCurrent ? "#ffbd02" : "#666" }}>{idx + 1}</span>
                  )}
                  <span className="flex-1 truncate font-outfit">{l.title}</span>
                  <span className="text-[10px]" style={{ color: "#666" }}>{l.duration_minutes}ד׳</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
