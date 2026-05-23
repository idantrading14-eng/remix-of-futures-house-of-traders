import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronDown, ChevronLeft, Plus, GripVertical, MoreVertical,
  CheckCircle2, Play, Lock, Edit, Copy, Trash2, Video, FileText, File,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AddModuleModal from "./AddModuleModal";
import AddLessonModal from "./AddLessonModal";

type Module = { id: string; course_id: string; title: string; description: string; thumbnail_url: string | null; access_level: string; sort_order: number };
type Lesson = { id: string; module_id: string; title: string; content_type: string; video_url: string | null; text_content: string | null; file_url: string | null; duration_minutes: number; access_level: string; sort_order: number };

export default function CourseContentTab({ courseId }: { courseId: string }) {
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showModuleModal, setShowModuleModal] = useState<Module | true | null>(null);
  const [showLessonModal, setShowLessonModal] = useState<{ moduleId: string; lesson?: Lesson } | null>(null);

  const fetchData = async () => {
    const { data: mods } = await supabase.from("modules").select("*").eq("course_id", courseId).order("sort_order");
    setModules((mods as Module[]) || []);
    if (mods && mods.length > 0) {
      const { data: allLessons } = await supabase
        .from("lessons")
        .select("*")
        .in("module_id", mods.map((m: any) => m.id))
        .order("sort_order");
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
      course_id: mod.course_id,
      title: mod.title + " (עותק)",
      description: mod.description,
      thumbnail_url: mod.thumbnail_url,
      access_level: mod.access_level,
      sort_order: modules.length,
    }).select().single();
    if (!error && data) {
      const modLessons = lessons[mod.id] || [];
      if (modLessons.length > 0) {
        await supabase.from("lessons").insert(
          modLessons.map((l, i) => ({
            module_id: data.id,
            title: l.title,
            content_type: l.content_type,
            video_url: l.video_url,
            text_content: l.text_content,
            file_url: l.file_url,
            duration_minutes: l.duration_minutes,
            access_level: l.access_level,
            sort_order: i,
          }))
        );
      }
      toast.success("המודול שוכפל");
      fetchData();
    }
  };

  const getAccessIcon = (level: string) => {
    if (level === "locked" || level === "pro") return <Lock className="w-4 h-4 text-amber-500" />;
    return <Play className="w-4 h-4 text-emerald-400" />;
  };

  const getContentTypeIcon = (type: string) => {
    if (type === "video") return <Video className="w-3.5 h-3.5 text-indigo-400" />;
    if (type === "text") return <FileText className="w-3.5 h-3.5 text-blue-400" />;
    return <File className="w-3.5 h-3.5 text-gray-400" />;
  };

  return (
    <div className="space-y-3">
      {modules.map((mod) => {
        const isExpanded = expanded[mod.id];
        const modLessons = lessons[mod.id] || [];
        const isLocked = mod.access_level === "locked" || mod.access_level === "pro";

        return (
          <div
            key={mod.id}
            className={`border border-white/[0.08] rounded-xl overflow-hidden transition-all ${isLocked ? "opacity-80" : ""}`}
          >
            {/* Module row */}
            <div
              className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-pointer"
              onClick={() => toggleExpand(mod.id)}
            >
              <GripVertical className="w-4 h-4 text-gray-600 shrink-0 cursor-grab" />
              {mod.thumbnail_url ? (
                <img src={mod.thumbnail_url} className="w-10 h-10 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-white/[0.06] shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium text-sm truncate">{mod.title}</span>
                  {isLocked && (
                    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 border text-[10px]">
                      {mod.access_level === "pro" ? "PRO" : "נעול"}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {modLessons.length} שיעורים | {modLessons.reduce((s, l) => s + (l.duration_minutes || 0), 0)} דק׳
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getAccessIcon(mod.access_level)}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button className="p-1 text-gray-500 hover:text-white"><MoreVertical className="w-4 h-4" /></button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#1a1a2e] border-white/10">
                    <DropdownMenuItem onClick={() => setShowModuleModal(mod)} className="text-gray-300"><Edit className="w-4 h-4 ml-2" />ערוך</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicateModule(mod)} className="text-gray-300"><Copy className="w-4 h-4 ml-2" />שכפל</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteModule(mod.id)} className="text-red-400"><Trash2 className="w-4 h-4 ml-2" />מחק</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronLeft className="w-4 h-4 text-gray-500" />}
              </div>
            </div>

            {/* Lessons */}
            {isExpanded && (
              <div className="border-t border-white/[0.06]">
                {modLessons.map((lesson, idx) => {
                  const lessonLocked = lesson.access_level === "locked" || lesson.access_level === "pro";
                  return (
                    <div
                      key={lesson.id}
                      className={`flex items-center gap-3 px-4 py-2.5 pr-14 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.03] transition-colors ${lessonLocked ? "opacity-60" : ""}`}
                    >
                      <GripVertical className="w-3.5 h-3.5 text-gray-700 shrink-0 cursor-grab" />
                      <span className="text-xs text-gray-600 w-5 shrink-0">{idx + 1}</span>
                      {getContentTypeIcon(lesson.content_type)}
                      <span className="text-sm text-gray-300 flex-1 truncate">{lesson.title}</span>
                      <span className="text-xs text-gray-600">{lesson.duration_minutes} דק׳</span>
                      {lessonLocked ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/40" />}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 text-gray-600 hover:text-white"><MoreVertical className="w-3.5 h-3.5" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1a1a2e] border-white/10">
                          <DropdownMenuItem onClick={() => setShowLessonModal({ moduleId: mod.id, lesson })} className="text-gray-300"><Edit className="w-4 h-4 ml-2" />ערוך</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteLesson(lesson.id)} className="text-red-400"><Trash2 className="w-4 h-4 ml-2" />מחק</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
                <button
                  onClick={() => setShowLessonModal({ moduleId: mod.id })}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-indigo-400 hover:bg-indigo-500/10 transition-colors"
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
        className="w-full border-dashed border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.04] hover:border-white/20"
      >
        <Plus className="w-4 h-4 ml-1.5" /> הוסף מודול
      </Button>

      {showModuleModal && (
        <AddModuleModal
          courseId={courseId}
          module={typeof showModuleModal === "object" ? showModuleModal : undefined}
          sortOrder={modules.length}
          onClose={() => setShowModuleModal(null)}
          onSaved={() => { setShowModuleModal(null); fetchData(); }}
        />
      )}

      {showLessonModal && (
        <AddLessonModal
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
