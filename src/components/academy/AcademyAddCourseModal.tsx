import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Upload, FileText, Code, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ThumbnailUpload from "@/components/courses/ThumbnailUpload";

type Props = {
  onClose: () => void;
  onSaved: () => void;
  course?: { id: string; title: string; description: string; type: string; price: number; thumbnail_url: string | null; external_id: string | null; content_type?: string; pdf_url?: string | null; html_content?: string | null };
};

const CONTENT_TYPES = [
  { value: "video", label: "שיעורי וידאו", icon: Video },
  { value: "pdf", label: "קובץ PDF", icon: FileText },
  { value: "html", label: "דף HTML מוטמע", icon: Code },
];

export default function AcademyAddCourseModal({ onClose, onSaved, course }: Props) {
  const [title, setTitle] = useState(course?.title || "");
  const [description, setDescription] = useState(course?.description || "");
  const [type, setType] = useState(course?.type || "basic");
  const [price, setPrice] = useState(course?.price?.toString() || "0");
  const [thumbnailUrl, setThumbnailUrl] = useState(course?.thumbnail_url || "");
  const [externalId, setExternalId] = useState(course?.external_id || "");
  const [contentType, setContentType] = useState(course?.content_type || "video");
  const [pdfUrl, setPdfUrl] = useState(course?.pdf_url || "");
  const [htmlContent, setHtmlContent] = useState(course?.html_content || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("נא להעלות קובץ PDF בלבד"); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error("הקובץ גדול מדי (מקסימום 50MB)"); return; }
    setUploading(true);
    const path = `pdfs/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("course-videos").upload(path, file);
    if (error) { toast.error("שגיאה בהעלאה"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("course-videos").getPublicUrl(path);
    setPdfUrl(urlData.publicUrl);
    setUploading(false);
    toast.success("הקובץ הועלה בהצלחה");
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("נא להזין שם קורס"); return; }
    if (contentType === "pdf" && !pdfUrl) { toast.error("נא להעלות קובץ PDF"); return; }
    if (contentType === "html" && !htmlContent.trim()) { toast.error("נא להזין קוד HTML"); return; }
    setSaving(true);
    const payload: any = {
      title: title.trim(), description, type, price: parseFloat(price) || 0,
      thumbnail_url: thumbnailUrl || null, external_id: externalId.trim() || null,
      content_type: contentType,
      pdf_url: contentType === "pdf" ? pdfUrl || null : null,
      html_content: contentType === "html" ? htmlContent || null : null,
    };

    if (course) {
      const { error } = await supabase.from("courses").update(payload).eq("id", course.id);
      if (error) { toast.error("שגיאה בעדכון"); setSaving(false); return; }
      toast.success("הקורס עודכן");
    } else {
      const { error } = await supabase.from("courses").insert(payload);
      if (error) { toast.error("שגיאה ביצירת קורס"); setSaving(false); return; }
      toast.success("הקורס נוצר בהצלחה");
    }
    setSaving(false);
    onSaved();
  };

  const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md p-6 space-y-5 rounded-2xl max-h-[90vh] overflow-y-auto" style={{ background: "rgb(40,40,38)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg font-outfit">{course ? "עריכת קורס" : "קורס חדש"}</h2>
          <button onClick={onClose} style={{ color: "#888" }}><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm mb-1.5 block" style={{ color: "#b8b8b8" }}>שם הקורס</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="למשל: Home Studio Blueprint" className="font-outfit" style={inputStyle} />
          </div>
          <div>
            <label className="text-sm mb-1.5 block" style={{ color: "#b8b8b8" }}>תיאור</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="תיאור הקורס..." className="min-h-[80px] font-outfit" style={inputStyle} />
          </div>
          <div>
            <label className="text-sm mb-1.5 block" style={{ color: "#b8b8b8" }}>תמונת כריכה</label>
            <ThumbnailUpload value={thumbnailUrl} onChange={setThumbnailUrl} inputStyle={inputStyle} inputClassName="font-outfit" />
          </div>

          {/* Content Type Selector */}
          <div>
            <label className="text-sm mb-1.5 block" style={{ color: "#b8b8b8" }}>סוג תוכן</label>
            <div className="grid grid-cols-3 gap-2">
              {CONTENT_TYPES.map(ct => {
                const Icon = ct.icon;
                const active = contentType === ct.value;
                return (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => setContentType(ct.value)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-all"
                    style={{
                      background: active ? "rgba(255,189,2,0.12)" : "rgba(255,255,255,0.04)",
                      border: active ? "1px solid rgba(255,189,2,0.4)" : "1px solid rgba(255,255,255,0.1)",
                      color: active ? "#ffbd02" : "#888",
                    }}
                  >
                    <Icon className="w-5 h-5" />
                    {ct.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PDF Upload */}
          {contentType === "pdf" && (
            <div>
              <label className="text-sm mb-1.5 block" style={{ color: "#b8b8b8" }}>קובץ PDF</label>
              <input type="file" accept=".pdf" ref={fileRef} onChange={handlePdfUpload} className="hidden" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.15)", color: "#b8b8b8" }}
              >
                {uploading ? (
                  <span className="text-sm">מעלה...</span>
                ) : pdfUrl ? (
                  <span className="text-sm text-emerald-400 flex items-center gap-2"><FileText className="w-4 h-4" />קובץ הועלה ✓ (לחץ להחלפה)</span>
                ) : (
                  <span className="text-sm flex items-center gap-2"><Upload className="w-4 h-4" />העלה קובץ PDF</span>
                )}
              </button>
            </div>
          )}

          {/* HTML Editor */}
          {contentType === "html" && (
            <div>
              <label className="text-sm mb-1.5 block" style={{ color: "#b8b8b8" }}>קוד HTML</label>
              <Textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="<html>...</html>"
                dir="ltr"
                className="min-h-[150px] font-mono text-xs font-outfit"
                style={inputStyle}
              />
            </div>
          )}

          <div>
            <label className="text-sm mb-1.5 block" style={{ color: "#b8b8b8" }}>מזהה ייחודי (אופציונלי)</label>
            <Input value={externalId} onChange={(e) => setExternalId(e.target.value)} placeholder="למשל: COURSE-001" dir="ltr" className="font-outfit" style={inputStyle} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm mb-1.5 block" style={{ color: "#b8b8b8" }}>סוג</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full h-10 rounded-xl text-sm px-3 outline-none font-outfit" style={inputStyle}>
                <option value="basic">בסיסי</option>
                <option value="pro">PRO</option>
                <option value="done_for_you">Done-for-you</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm mb-1.5 block" style={{ color: "#b8b8b8" }}>מחיר (₪)</label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="font-outfit" style={inputStyle} />
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button onClick={onClose} variant="outline" className="flex-1 font-outfit" style={{ borderColor: "rgba(255,255,255,0.1)", color: "#b8b8b8" }}>ביטול</Button>
          <Button onClick={handleSave} disabled={saving || uploading} className="flex-1 font-outfit font-semibold" style={{ background: "#ffbd02", color: "rgb(36,36,34)" }}>
            {saving ? "שומר..." : "שמור"}
          </Button>
        </div>
      </div>
    </div>
  );
}
