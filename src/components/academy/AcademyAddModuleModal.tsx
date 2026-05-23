import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Upload, Link, Code, Video, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Module = {
  id: string; title: string; description: string; thumbnail_url: string | null;
  access_level: string; video_source_type?: string; video_url?: string | null;
  video_file_url?: string | null; embed_code?: string | null; notes?: string;
};

type Props = {
  courseId: string; module?: Module; sortOrder: number;
  onClose: () => void; onSaved: () => void;
};

const VIDEO_TABS = [
  { key: "none", label: "ללא וידאו", icon: Video },
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

export default function AcademyAddModuleModal({ courseId, module, sortOrder, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(module?.title || "");
  const [description, setDescription] = useState(module?.description || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(module?.thumbnail_url || "");
  const [accessLevel, setAccessLevel] = useState(module?.access_level || "open");
  const [videoSourceType, setVideoSourceType] = useState(module?.video_source_type || "none");
  const [videoUrl, setVideoUrl] = useState(module?.video_url || "");
  const [videoFileUrl, setVideoFileUrl] = useState(module?.video_file_url || "");
  const [embedCode, setEmbedCode] = useState(module?.embed_code || "");
  const [notes, setNotes] = useState(module?.notes || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    const fileName = `modules/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from("course-videos").upload(fileName, file);
    if (error) {
      toast.error("שגיאה בהעלאה: " + error.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("course-videos").getPublicUrl(fileName);
    setVideoFileUrl(urlData.publicUrl);
    setUploading(false);
    toast.success("הקובץ הועלה בהצלחה");
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("נא להזין שם מודול"); return; }
    setSaving(true);
    const payload: any = {
      title: title.trim(), description, access_level: accessLevel,
      thumbnail_url: thumbnailUrl || null,
      video_source_type: videoSourceType,
      video_url: videoSourceType === "url" ? videoUrl : null,
      video_file_url: videoSourceType === "file" ? videoFileUrl : null,
      embed_code: videoSourceType === "embed" ? embedCode : null,
      notes: notes || "",
    };

    if (module) {
      const { error } = await supabase.from("modules").update(payload).eq("id", module.id);
      if (error) { toast.error("שגיאה בעדכון"); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("modules").insert({ ...payload, course_id: courseId, sort_order: sortOrder });
      if (error) { toast.error("שגיאה ביצירה"); setSaving(false); return; }
    }
    toast.success(module ? "המודול עודכן" : "המודול נוצר");
    setSaving(false);
    onSaved();
  };

  const embedPreviewUrl = videoSourceType === "url" && videoUrl ? getEmbedUrl(videoUrl) : null;
  const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg p-6 space-y-5 rounded-2xl max-h-[90vh] overflow-auto scrollbar-thin" style={{ background: "rgb(40,40,38)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg font-outfit">{module ? "עריכת מודול" : "מודול חדש"}</h2>
          <button onClick={onClose} style={{ color: "#888" }}><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-sm mb-1.5 block" style={{ color: "#b8b8b8" }}>שם המודול</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="font-outfit" style={inputStyle} />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm mb-1.5 block" style={{ color: "#b8b8b8" }}>תיאור</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[60px] font-outfit" style={inputStyle} />
          </div>

          {/* Thumbnail */}
          <div>
            <label className="text-sm mb-1.5 block" style={{ color: "#b8b8b8" }}>כתובת תמונה ממוזערת</label>
            <Input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://..." dir="ltr" className="font-outfit" style={inputStyle} />
          </div>

          {/* Video Source Tabs */}
          <div>
            <label className="text-sm mb-2 block" style={{ color: "#b8b8b8" }}>וידאו למודול</label>
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
              {VIDEO_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = videoSourceType === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setVideoSourceType(tab.key)}
                    className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-medium transition-all font-outfit"
                    style={{
                      background: isActive ? "rgba(255,189,2,0.15)" : "transparent",
                      color: isActive ? "#ffbd02" : "#888",
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* URL Tab */}
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
                  style={inputStyle}
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

          {/* File Upload Tab */}
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
                      <span className="text-sm font-outfit">מעלה...</span>
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
                    variant="outline" size="sm"
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

          {/* Embed Code Tab */}
          {videoSourceType === "embed" && (
            <div className="space-y-3">
              <div>
                <label className="text-sm mb-1.5 block" style={{ color: "#b8b8b8" }}>קוד הטמעה (iframe)</label>
                <Textarea
                  value={embedCode}
                  onChange={(e) => setEmbedCode(e.target.value)}
                  placeholder='<iframe src="..." ...></iframe>'
                  dir="ltr"
                  className="min-h-[80px] font-mono text-xs"
                  style={inputStyle}
                />
              </div>
              {embedCode && (
                <div className="rounded-xl overflow-hidden aspect-video" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: embedCode }} />
                </div>
              )}
            </div>
          )}

          {/* Notes for students */}
          <div>
            <label className="text-sm mb-1.5 block" style={{ color: "#b8b8b8" }}>הערות (יוצגו לתלמידים)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות, טיפים או מידע נוסף שיוצג לתלמידים מתחת לפרק..."
              className="min-h-[80px] font-outfit"
              style={inputStyle}
            />
          </div>

          {/* Access Level */}
          <div>
            <label className="text-sm mb-1.5 block" style={{ color: "#b8b8b8" }}>רמת גישה</label>
            <select value={accessLevel} onChange={(e) => setAccessLevel(e.target.value)} className="w-full h-10 rounded-xl text-sm px-3 outline-none font-outfit" style={inputStyle}>
              <option value="open">פתוח</option>
              <option value="pro">PRO בלבד</option>
              <option value="locked">נעול</option>
            </select>
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
