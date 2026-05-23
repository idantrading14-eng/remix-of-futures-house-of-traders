import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Lesson = { id: string; title: string; content_type: string; video_url: string | null; text_content: string | null; file_url: string | null; duration_minutes: number; access_level: string };

type Props = {
  moduleId: string;
  lesson?: Lesson;
  sortOrder: number;
  onClose: () => void;
  onSaved: () => void;
};

export default function AddLessonModal({ moduleId, lesson, sortOrder, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(lesson?.title || "");
  const [contentType, setContentType] = useState(lesson?.content_type || "video");
  const [videoUrl, setVideoUrl] = useState(lesson?.video_url || "");
  const [textContent, setTextContent] = useState(lesson?.text_content || "");
  const [fileUrl, setFileUrl] = useState(lesson?.file_url || "");
  const [duration, setDuration] = useState(lesson?.duration_minutes?.toString() || "0");
  const [accessLevel, setAccessLevel] = useState(lesson?.access_level || "open");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) { toast.error("נא להזין שם שיעור"); return; }
    setSaving(true);
    const payload = {
      title: title.trim(),
      content_type: contentType,
      video_url: contentType === "video" ? videoUrl : null,
      text_content: contentType === "text" ? textContent : null,
      file_url: contentType === "file" ? fileUrl : null,
      duration_minutes: parseInt(duration) || 0,
      access_level: accessLevel,
    };

    if (lesson) {
      const { error } = await supabase.from("lessons").update(payload).eq("id", lesson.id);
      if (error) { toast.error("שגיאה בעדכון"); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("lessons").insert({ ...payload, module_id: moduleId, sort_order: sortOrder });
      if (error) { toast.error("שגיאה ביצירה"); setSaving(false); return; }
    }
    toast.success(lesson ? "השיעור עודכן" : "השיעור נוצר");
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#12121f] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-auto scrollbar-thin">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">{lesson ? "עריכת שיעור" : "שיעור חדש"}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">שם השיעור</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white/[0.04] border-white/10 text-white" />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">סוג תוכן</label>
            <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="w-full h-10 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm px-3 outline-none">
              <option value="video">וידאו</option>
              <option value="text">טקסט</option>
              <option value="file">קובץ</option>
            </select>
          </div>
          {contentType === "video" && (
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">כתובת וידאו</label>
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="bg-white/[0.04] border-white/10 text-white" placeholder="https://..." dir="ltr" />
            </div>
          )}
          {contentType === "text" && (
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">תוכן טקסט</label>
              <Textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} className="bg-white/[0.04] border-white/10 text-white min-h-[100px]" />
            </div>
          )}
          {contentType === "file" && (
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">כתובת קובץ</label>
              <Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} className="bg-white/[0.04] border-white/10 text-white" placeholder="https://..." dir="ltr" />
            </div>
          )}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm text-gray-400 mb-1.5 block">משך (דקות)</label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="bg-white/[0.04] border-white/10 text-white" />
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-400 mb-1.5 block">רמת גישה</label>
              <select value={accessLevel} onChange={(e) => setAccessLevel(e.target.value)} className="w-full h-10 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm px-3 outline-none">
                <option value="open">פתוח</option>
                <option value="pro">PRO בלבד</option>
                <option value="locked">נעול</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button onClick={onClose} variant="outline" className="flex-1 border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.04]">ביטול</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white">{saving ? "שומר..." : "שמור"}</Button>
        </div>
      </div>
    </div>
  );
}
