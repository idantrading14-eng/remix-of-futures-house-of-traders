import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Upload, Link, Code, Video, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Lesson = {
  id: string; title: string; content_type: string; video_source_type: string;
  video_url: string | null; video_file_url: string | null; embed_code: string | null;
  text_content: string | null; file_url: string | null; duration_minutes: number;
  access_level: string; description: string | null; thumbnail_url: string | null;
};

type Props = {
  moduleId: string; lesson?: Lesson; sortOrder: number;
  onClose: () => void; onSaved: () => void;
};

const VIDEO_TABS = [
  { key: "url", label: "קישור", icon: Link },
  { key: "file", label: "העלאת קובץ", icon: Upload },
  { key: "embed", label: "קוד הטמעה", icon: Code },
];

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

export default function AcademyAddLessonModal({ moduleId, lesson, sortOrder, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(lesson?.title || "");
  const [videoSourceType, setVideoSourceType] = useState(lesson?.video_source_type || "url");
  const [videoUrl, setVideoUrl] = useState(lesson?.video_url || "");
  const [videoFileUrl, setVideoFileUrl] = useState(lesson?.video_file_url || "");
  const [embedCode, setEmbedCode] = useState(lesson?.embed_code || "");
  const [description, setDescription] = useState(lesson?.description || "");
  const [duration, setDuration] = useState(lesson?.duration_minutes?.toString() || "0");
  const [accessLevel, setAccessLevel] = useState(lesson?.access_level || "open");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("סוג קובץ לא נתמך. השתמש ב-MP4, MOV, WebM או AVI");
      return;
    }
    setUploading(true);
    setUploadProgress(0);

    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from("course-videos").upload(fileName, file);

    if (error) {
      toast.error("שגיאה בהעלאה: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("course-videos").getPublicUrl(fileName);
    setVideoFileUrl(urlData.publicUrl);
    setUploadProgress(100);
    setUploading(false);
    toast.success("הקובץ הועלה בהצלחה");
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("נא להזין שם שיעור"); return; }
    setSaving(true);
    const payload: any = {
      title: title.trim(),
      content_type: "video",
      video_source_type: videoSourceType,
      video_url: videoSourceType === "url" ? videoUrl : null,
      video_file_url: videoSourceType === "file" ? videoFileUrl : null,
      embed_code: videoSourceType === "embed" ? embedCode : null,
      text_content: null,
      file_url: null,
      duration_minutes: parseInt(duration) || 0,
      access_level: accessLevel,
      description: description || null,
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

  const embedPreviewUrl = videoSourceType === "url" && videoUrl ? getEmbedUrl(videoUrl) : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg p-6 space-y-5 rounded-2xl max-h-[90vh] overflow-auto scrollbar-thin" style={{ background: "rgb(40,40,38)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg font-outfit">{lesson ? "עריכת שיעור" : "שיעור חדש"}</h2>
          <button onClick={onClose} style={{ color: "#888" }}><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-sm mb-1.5 block" style={{ color: "#b8b8b8" }}>שם השיעור</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="font-outfit" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
          </div>

          {/* Video Source Tabs */}
          <div>
            <label className="text-sm mb-2 block" style={{ color: "#b8b8b8" }}>מקור וידאו</label>
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
              {VIDEO_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = videoSourceType === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setVideoSourceType(tab.key)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all font-outfit"
                    style={{
                      background: isActive ? "rgba(255,189,2,0.15)" : "transparent",
                      color: isActive ? "#ffbd02" : "#888",
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab 1: URL */}
          {videoSourceType === "url" && (
            <div className="space-y-3">
              <div>
                <label className="text-sm mb-1.5 block" style={{ color: "#b8b8b8" }}>קישור YouTube / Vimeo</label>
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  dir="ltr"
                  className="font-outfit"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                />
              </div>
              {embedPreviewUrl && (
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="aspect-video">
                    <iframe src={embedPreviewUrl} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: File Upload */}
          {videoSourceType === "file" && (
            <div className="space-y-3">
              <input ref={fileInputRef} type="file" accept=".mp4,.mov,.webm,.avi" className="hidden" onChange={handleFileUpload} />
              {!videoFileUrl ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full py-8 rounded-xl border-2 border-dashed flex flex-col items-center gap-2 transition-colors"
                  style={{ borderColor: "rgba(255,189,2,0.3)", color: "#b8b8b8" }}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#ffbd02" }} />
                      <span className="text-sm">מעלה... {uploadProgress}%</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8" style={{ color: "#ffbd02" }} />
                      <span className="text-sm font-outfit">גרור קובץ או לחץ להעלאה</span>
                      <span className="text-xs" style={{ color: "#666" }}>MP4, MOV, WebM, AVI</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                    <video src={videoFileUrl} controls className="w-full aspect-video" />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setVideoFileUrl(""); fileInputRef.current?.click(); }}
                    className="font-outfit"
                    style={{ borderColor: "rgba(255,255,255,0.1)", color: "#b8b8b8" }}
                  >
                    החלף קובץ
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Embed Code */}
          {videoSourceType === "embed" && (
            <div className="space-y-3">
              <div>
                <label className="text-sm mb-1.5 block" style={{ color: "#b8b8b8" }}>קוד הטמעה (iframe)</label>
                <Textarea
                  value={embedCode}
                  onChange={(e) => setEmbedCode(e.target.value)}
                  placeholder='<iframe src="..." ...></iframe>'
                  dir="ltr"
                  className="min-h-[80px] font-mono text-xs font-outfit"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                />
              </div>
              {embedCode && (
                <div className="rounded-xl overflow-hidden aspect-video" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: embedCode }} />
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-sm mb-1.5 block" style={{ color: "#b8b8b8" }}>תיאור השיעור</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תיאור אופציונלי..."
              className="min-h-[60px] font-outfit"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
            />
          </div>

          {/* Duration & Access */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm mb-1.5 block" style={{ color: "#b8b8b8" }}>משך (דקות)</label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="font-outfit" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
            </div>
            <div className="flex-1">
              <label className="text-sm mb-1.5 block" style={{ color: "#b8b8b8" }}>רמת גישה</label>
              <select value={accessLevel} onChange={(e) => setAccessLevel(e.target.value)} className="w-full h-10 rounded-xl text-sm px-3 outline-none font-outfit" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}>
                <option value="open">פתוח</option>
                <option value="pro">PRO בלבד</option>
                <option value="locked">נעול</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={onClose} variant="outline" className="flex-1 font-outfit" style={{ borderColor: "rgba(255,255,255,0.1)", color: "#b8b8b8" }}>ביטול</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 font-outfit font-semibold" style={{ background: "#ffbd02", color: "rgb(36,36,34)" }}>
            {saving ? "שומר..." : "שמור"}
          </Button>
        </div>
      </div>
    </div>
  );
}
