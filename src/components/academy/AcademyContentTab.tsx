import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronDown, ChevronLeft, Plus, GripVertical, MoreVertical,
  CheckCircle2, Play, Lock, Edit, Copy, Trash2, Video, FileText, File, Code,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AcademyAddModuleModal from "./AcademyAddModuleModal";
import AcademyAddLessonModal from "./AcademyAddLessonModal";
import AcademyLessonViewer from "./AcademyLessonViewer";

type Module = { id: string; course_id: string; title: string; description: string; thumbnail_url: string | null; access_level: string; sort_order: number; video_source_type?: string; video_url?: string | null; video_file_url?: string | null; embed_code?: string | null; notes?: string };
type Lesson = { id: string; module_id: string; title: string; content_type: string; video_source_type: string; video_url: string | null; video_file_url: string | null; embed_code: string | null; text_content: string | null; file_url: string | null; duration_minutes: number; access_level: string; sort_order: number; description: string | null; thumbnail_url: string | null };

export default function AcademyContentTab({ courseId }: { courseId: string }) {
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showModuleModal, setShowModuleModal] = useState<Module | true | null>(null);
  const [showLessonModal, setShowLessonModal] = useState<{ moduleId: string; lesson?: Lesson } | null>(null);
  const [viewingLesson, setViewingLesson] = useState<{ lesson: Lesson; moduleId: string } | null>(null);

  const fetchData = async () => {
    const { data: mods } = await supabase.from("modules").select("*").eq("course_id", courseId).order("sort_order");
    setModules((mods as Module[]) || []);
    if (mods && mods.length > 0) {
      const { data: allLessons } = await supabase.from("lessons").select("*").in("module_id", mods.map((m: any) => m.id)).order("sort_order");
      const grouped: Record<string, Lesson[]> = {};
      (allLessons || []).forEach((l: any) => {
        if (!grouped[l.module_id]) grouped[l.module_id] = [];
        grouped[l.module_id].push(l);
      });
      setLessons(grouped);
    }
  };

  useEffect(() => { fetchData(); }, [courseId]);

  const toggleExpand = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const deleteModule = async (id: string) => {
    await supabase.from("modules").delete().eq("id", id);
    toast.success("המודול נמחק");
    fetchData();
  };

  const deleteLesson = async (id: string) => {
    await supabase.from("lessons").delete().eq("id", id);
    toast.success("השיעור נמחק");
    fetchData();
  };

  const duplicateModule = async (mod: Module) => {
    const { data, error } = await supabase.from("modules").insert({
      course_id: mod.course_id, title: mod.title + " (עותק)", description: mod.description,
      thumbnail_url: mod.thumbnail_url, access_level: mod.access_level, sort_order: modules.length,
      video_source_type: mod.video_source_type, video_url: mod.video_url,
      video_file_url: mod.video_file_url, embed_code: mod.embed_code, notes: mod.notes || "",
    }).select().single();
    if (!error && data) {
      const modLessons = lessons[mod.id] || [];
      if (modLessons.length > 0) {
        await supabase.from("lessons").insert(
          modLessons.map((l, i) => ({
            module_id: data.id, title: l.title, content_type: l.content_type,
            video_source_type: l.video_source_type, video_url: l.video_url,
            video_file_url: l.video_file_url, embed_code: l.embed_code,
            text_content: l.text_content, file_url: l.file_url,
            duration_minutes: l.duration_minutes, access_level: l.access_level, sort_order: i,
            description: l.description, thumbnail_url: l.thumbnail_url,
          }))
        );
      }
      toast.success("המודול שוכפל");
      fetchData();
    }
  };

  const getAccessIcon = (level: string) => {
    if (level === "locked" || level === "pro") return <Lock className="w-4 h-4" style={{ color: "#ffbd02" }} />;
    return <Play className="w-4 h-4" style={{ color: "#10b981" }} />;
  };

  const getSourceIcon = (type: string) => {
    if (type === "file") return <Video className="w-3.5 h-3.5" style={{ color: "#ffbd02" }} />;
    if (type === "embed") return <Code className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} />;
    return <Video className="w-3.5 h-3.5" style={{ color: "#60a5fa" }} />;
  };

  const hasVideo = (lesson: Lesson) => {
    return (lesson.video_source_type === "url" && lesson.video_url) ||
           (lesson.video_source_type === "file" && lesson.video_file_url) ||
           (lesson.video_source_type === "embed" && lesson.embed_code) ||
           lesson.video_url; // fallback
  };

  // If viewing a lesson, show the lesson viewer
  if (viewingLesson) {
    const moduleLessons = lessons[viewingLesson.moduleId] || [];
    return (
      <>
        <AcademyLessonViewer
          lesson={viewingLesson.lesson}
          allLessons={moduleLessons}
          onBack={() => setViewingLesson(null)}
          onNavigate={(l) => setViewingLesson({ lesson: l, moduleId: viewingLesson.moduleId })}
          onEdit={(lesson) => setShowLessonModal({ moduleId: viewingLesson.moduleId, lesson })}
        />

        {showLessonModal && (
          <AcademyAddLessonModal
            moduleId={showLessonModal.moduleId}
            lesson={showLessonModal.lesson}
            sortOrder={(lessons[showLessonModal.moduleId] || []).length}
            onClose={() => setShowLessonModal(null)}
            onSaved={async () => {
              setShowLessonModal(null);
              await fetchData();
              const { data } = await supabase.from("lessons").select("*").eq("id", viewingLesson.lesson.id).single();
              if (data) setViewingLesson({ lesson: data as Lesson, moduleId: viewingLesson.moduleId });
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="space-y-3">
      {modules.map((mod) => {
        const isExpanded = expanded[mod.id];
        const modLessons = lessons[mod.id] || [];
        const isLocked = mod.access_level === "locked" || mod.access_level === "pro";

        return (
          <div
            key={mod.id}
            className="rounded-xl overflow-hidden transition-all"
            style={{ border: "1px solid rgba(255,255,255,0.08)", opacity: isLocked ? 0.8 : 1 }}
          >
            {/* Module row */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
              style={{ background: "rgba(255,255,255,0.03)" }}
              onClick={() => toggleExpand(mod.id)}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
            >
              <GripVertical className="w-4 h-4 shrink-0 cursor-grab" style={{ color: "#555" }} />
              {mod.thumbnail_url ? (
                <img src={mod.thumbnail_url} className="w-10 h-10 rounded-lg object-cover shrink-0" style={{ border: "1px solid rgba(255,189,2,0.3)" }} />
              ) : (
                <div className="w-10 h-10 rounded-lg shrink-0" style={{ background: "rgba(255,255,255,0.06)" }} />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {isLocked && <Lock className="w-3.5 h-3.5 shrink-0" style={{ color: "#ffbd02" }} />}
                  <span className="font-medium text-sm truncate font-outfit">{mod.title}</span>
                  {mod.access_level === "pro" && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: "rgba(255,189,2,0.15)", color: "#ffbd02" }}>PRO</span>
                  )}
                </div>
                <span className="text-xs" style={{ color: "#888" }}>
                  {modLessons.length} שיעורים | {modLessons.reduce((s, l) => s + (l.duration_minutes || 0), 0)} דק׳
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getAccessIcon(mod.access_level)}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button className="p-1" style={{ color: "#888" }}><MoreVertical className="w-4 h-4" /></button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" style={{ background: "rgb(45,45,43)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <DropdownMenuItem onClick={() => setShowModuleModal(mod)} style={{ color: "#ccc" }}><Edit className="w-4 h-4 ml-2" />ערוך</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicateModule(mod)} style={{ color: "#ccc" }}><Copy className="w-4 h-4 ml-2" />שכפל</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteModule(mod.id)} style={{ color: "#f87171" }}><Trash2 className="w-4 h-4 ml-2" />מחק</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {isExpanded ? <ChevronDown className="w-4 h-4" style={{ color: "#888" }} /> : <ChevronLeft className="w-4 h-4" style={{ color: "#888" }} />}
              </div>
            </div>

            {/* Lessons */}
            {isExpanded && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                {modLessons.map((lesson, idx) => {
                  const lessonLocked = lesson.access_level === "locked" || lesson.access_level === "pro";
                  const videoAvailable = hasVideo(lesson);
                  return (
                    <div
                      key={lesson.id}
                      className="flex items-center gap-3 px-4 py-2.5 pr-14 transition-colors cursor-pointer"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", opacity: lessonLocked ? 0.6 : 1 }}
                      onClick={() => !lessonLocked && setViewingLesson({ lesson, moduleId: mod.id })}
                      onMouseEnter={(e) => !lessonLocked && (e.currentTarget.style.background = "rgba(255,189,2,0.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <GripVertical className="w-3.5 h-3.5 shrink-0 cursor-grab" style={{ color: "#444" }} onClick={(e) => e.stopPropagation()} />
                      <span className="text-xs w-5 shrink-0" style={{ color: "#666" }}>{idx + 1}</span>
                      {getSourceIcon(lesson.video_source_type)}
                      <span className="text-sm flex-1 truncate font-outfit" style={{ color: "#ccc" }}>{lesson.title}</span>
                      {videoAvailable && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa" }}>▶ וידאו</span>
                      )}
                      <span className="text-xs" style={{ color: "#666" }}>{lesson.duration_minutes} דק׳</span>
                      {lessonLocked ? <Lock className="w-3.5 h-3.5" style={{ color: "#ffbd02" }} /> : <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "rgba(16,185,129,0.4)" }} />}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button className="p-1" style={{ color: "#666" }}><MoreVertical className="w-3.5 h-3.5" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" style={{ background: "rgb(45,45,43)", border: "1px solid rgba(255,255,255,0.1)" }}>
                          <DropdownMenuItem onClick={() => setShowLessonModal({ moduleId: mod.id, lesson })} style={{ color: "#ccc" }}><Edit className="w-4 h-4 ml-2" />ערוך</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteLesson(lesson.id)} style={{ color: "#f87171" }}><Trash2 className="w-4 h-4 ml-2" />מחק</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
                <button
                  onClick={() => setShowLessonModal({ moduleId: mod.id })}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs transition-colors font-outfit"
                  style={{ color: "#ffbd02" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,189,2,0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <Plus className="w-3.5 h-3.5" /> הוסף שיעור
                </button>
              </div>
            )}
          </div>
        );
      })}

      <Button
        onClick={() => setShowModuleModal(true)}
        variant="outline"
        className="w-full border-dashed font-outfit"
        style={{ borderColor: "rgba(255,255,255,0.1)", color: "#b8b8b8" }}
      >
        <Plus className="w-4 h-4 ml-1.5" /> הוסף מודול
      </Button>

      {showModuleModal && (
        <AcademyAddModuleModal
          courseId={courseId}
          module={typeof showModuleModal === "object" ? showModuleModal : undefined}
          sortOrder={modules.length}
          onClose={() => setShowModuleModal(null)}
          onSaved={() => { setShowModuleModal(null); fetchData(); }}
        />
      )}

      {showLessonModal && (
        <AcademyAddLessonModal
          moduleId={showLessonModal.moduleId}
          lesson={showLessonModal.lesson}
          sortOrder={(lessons[showLessonModal.moduleId] || []).length}
          onClose={() => setShowLessonModal(null)}
          onSaved={() => { setShowLessonModal(null); fetchData(); }}
        />
      )}
    </div>
  );
}
