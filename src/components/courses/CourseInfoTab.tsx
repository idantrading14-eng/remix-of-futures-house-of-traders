import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ThumbnailUpload from "./ThumbnailUpload";
import { Upload, FileText, Code, Video } from "lucide-react";

type Props = { course: any; onSaved: () => void };

const CONTENT_TYPES = [
  { value: "video", label: "שיעורי וידאו", icon: Video },
  { value: "pdf", label: "קובץ PDF", icon: FileText },
  { value: "html", label: "דף HTML מוטמע", icon: Code },
];

export default function CourseInfoTab({ course, onSaved }: Props) {
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description || "");
  const [type, setType] = useState(course.type);
  const [price, setPrice] = useState(course.price?.toString() || "0");
  const [thumbnailUrl, setThumbnailUrl] = useState(course.thumbnail_url || "");
  const [externalId, setExternalId] = useState(course.external_id || "");
  const [contentType, setContentType] = useState(course.content_type || "video");
  const [pdfUrl, setPdfUrl] = useState(course.pdf_url || "");
  const [htmlContent, setHtmlContent] = useState(course.html_content || "");
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
    const { error } = await supabase.from("courses").update({
      title: title.trim(), description, type, price: parseFloat(price) || 0,
      thumbnail_url: thumbnailUrl || null, external_id: externalId.trim() || null,
      content_type: contentType,
      pdf_url: contentType === "pdf" ? pdfUrl || null : null,
      html_content: contentType === "html" ? htmlContent || null : null,
      updated_at: new Date().toISOString(),
    }).eq("id", course.id);
    if (error) { toast.error("שגיאה בשמירה"); } else { toast.success("השינויים נשמרו"); onSaved(); }
    setSaving(false);
  };

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <label className="text-sm text-gray-400 mb-1.5 block">שם הקורס</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white/[0.04] border-white/10 text-white" />
      </div>
      <div>
        <label className="text-sm text-gray-400 mb-1.5 block">תיאור</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white/[0.04] border-white/10 text-white min-h-[120px]" />
      </div>
      <div>
        <label className="text-sm text-gray-400 mb-1.5 block">תמונת כריכה</label>
        <ThumbnailUpload value={thumbnailUrl} onChange={setThumbnailUrl} inputStyle={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
      </div>

      <div>
        <label className="text-sm text-gray-400 mb-1.5 block">סוג תוכן</label>
        <div className="grid grid-cols-3 gap-2">
          {CONTENT_TYPES.map(ct => {
            const Icon = ct.icon;
            const active = contentType === ct.value;
            return (
              <button key={ct.value} type="button" onClick={() => setContentType(ct.value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-all border ${active ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400" : "bg-white/[0.04] border-white/10 text-gray-500"}`}>
                <Icon className="w-5 h-5" />{ct.label}
              </button>
            );
          })}
        </div>
      </div>

      {contentType === "pdf" && (
        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">קובץ PDF</label>
          <input type="file" accept=".pdf" ref={fileRef} onChange={handlePdfUpload} className="hidden" />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-white/[0.04] border border-dashed border-white/15 text-gray-400">
            {uploading ? "מעלה..." : pdfUrl ? <span className="text-emerald-400 flex items-center gap-2"><FileText className="w-4 h-4" />קובץ הועלה ✓</span> : <span className="flex items-center gap-2"><Upload className="w-4 h-4" />העלה קובץ PDF</span>}
          </button>
        </div>
      )}

      {contentType === "html" && (
        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">קוד HTML</label>
          <Textarea value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} placeholder="<html>...</html>" dir="ltr" className="bg-white/[0.04] border-white/10 text-white min-h-[200px] font-mono text-xs" />
        </div>
      )}

      <div>
        <label className="text-sm text-gray-400 mb-1.5 block">מזהה ייחודי (אופציונלי)</label>
        <Input value={externalId} onChange={(e) => setExternalId(e.target.value)} className="bg-white/[0.04] border-white/10 text-white" placeholder="למשל: COURSE-001" dir="ltr" />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-sm text-gray-400 mb-1.5 block">סוג קורס</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full h-10 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm px-3 outline-none">
            <option value="basic">בסיסי</option>
            <option value="pro">PRO</option>
            <option value="done_for_you">Done-for-you</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="text-sm text-gray-400 mb-1.5 block">מחיר (₪)</label>
          <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="bg-white/[0.04] border-white/10 text-white" />
        </div>
      </div>
      <Button onClick={handleSave} disabled={saving || uploading} className="bg-indigo-500 hover:bg-indigo-400 text-white">
        {saving ? "שומר..." : "שמור שינויים"}
      </Button>
    </div>
  );
}
