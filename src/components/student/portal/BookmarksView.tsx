import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bookmark, BookOpen, Play, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";

type BookmarkItem = {
  id: string;
  lesson_id: string;
  created_at: string;
  lesson_title: string;
  course_title: string;
  course_id: string;
  duration: number | null;
  thumbnail_url: string | null;
};

interface Props {
  userId: string;
  onOpenLesson?: (courseId: string) => void;
}

export default function BookmarksView({ userId, onOpenLesson }: Props) {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookmarks = async () => {
    // Get user's bookmarks
    const { data: bms } = await supabase
      .from("lesson_bookmarks")
      .select("id, lesson_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!bms || bms.length === 0) {
      setBookmarks([]);
      setLoading(false);
      return;
    }

    const lessonIds = bms.map((b) => b.lesson_id);
    const { data: lessons } = await supabase
      .from("lessons")
      .select("id, title, duration_minutes, thumbnail_url, module_id")
      .in("id", lessonIds);

    if (!lessons) { setBookmarks([]); setLoading(false); return; }

    // Get module -> course mapping
    const moduleIds = [...new Set(lessons.map((l) => l.module_id))];
    const { data: modules } = await supabase
      .from("modules")
      .select("id, course_id")
      .in("id", moduleIds);

    const courseIds = [...new Set((modules || []).map((m) => m.course_id))];
    const { data: courses } = await supabase
      .from("courses")
      .select("id, title")
      .in("id", courseIds);

    const moduleMap = new Map((modules || []).map((m) => [m.id, m.course_id]));
    const courseMap = new Map((courses || []).map((c) => [c.id, c.title]));
    const lessonMap = new Map(lessons.map((l) => [l.id, l]));

    const items: BookmarkItem[] = bms.map((b) => {
      const lesson = lessonMap.get(b.lesson_id);
      const courseId = lesson ? moduleMap.get(lesson.module_id) || "" : "";
      return {
        id: b.id,
        lesson_id: b.lesson_id,
        created_at: b.created_at,
        lesson_title: lesson?.title || "שיעור לא נמצא",
        course_title: courseMap.get(courseId) || "",
        course_id: courseId,
        duration: lesson?.duration_minutes || null,
        thumbnail_url: lesson?.thumbnail_url || null,
      };
    });

    setBookmarks(items);
    setLoading(false);
  };

  useEffect(() => { fetchBookmarks(); }, [userId]);

  const removeBookmark = async (bookmarkId: string) => {
    await supabase.from("lesson_bookmarks").delete().eq("id", bookmarkId);
    setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    toast.success("הסימנייה הוסרה");
  };

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

  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
        <Bookmark className="w-12 h-12 mb-4" style={{ color: "rgba(212, 160, 23, 0.3)" }} />
        <h3 className="text-lg font-bold text-white font-outfit mb-2">אין סימניות עדיין</h3>
        <p className="text-sm" style={{ color: "#777" }}>
          לחץ על כפתור הסימנייה בתוך שיעור כדי לשמור אותו כאן
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-6 rounded-full" style={{ background: "#d4a017" }} />
        <h3 className="text-lg font-bold text-white font-outfit">סימניות</h3>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(212,160,23,0.15)", color: "#d4a017" }}>
          {bookmarks.length}
        </span>
      </div>

      <div className="space-y-3">
        {bookmarks.map((bm) => (
          <div
            key={bm.id}
            className="flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 group"
            style={{ background: "#2a2a2a", border: "1px solid #3a3a3a" }}
          >
            {/* Thumbnail */}
            <div
              className="w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
              style={{ background: "rgba(212, 160, 23, 0.08)" }}
            >
              {bm.thumbnail_url ? (
                <img src={bm.thumbnail_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Play className="w-6 h-6" style={{ color: "#d4a017" }} />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{bm.lesson_title}</p>
              {bm.course_title && (
                <p className="text-xs mt-0.5 truncate" style={{ color: "#777" }}>{bm.course_title}</p>
              )}
              <div className="flex items-center gap-3 mt-1.5">
                {bm.duration && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" style={{ color: "#555" }} />
                    <span className="text-[11px]" style={{ color: "#555" }}>{bm.duration} דק׳</span>
                  </div>
                )}
                <span className="text-[11px]" style={{ color: "#444" }}>
                  {new Date(bm.created_at).toLocaleDateString("he-IL")}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {onOpenLesson && (
                <button
                  onClick={() => onOpenLesson(bm.course_id)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: "rgba(46, 204, 113, 0.15)", color: "#2ecc71" }}
                >
                  צפה
                </button>
              )}
              <button
                onClick={() => removeBookmark(bm.id)}
                className="p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                style={{ color: "#666" }}
                title="הסר סימנייה"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
