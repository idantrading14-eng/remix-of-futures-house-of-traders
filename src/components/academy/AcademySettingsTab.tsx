import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

type Props = { course: any; onSaved: () => void; onDeleted: () => void };

export default function AcademySettingsTab({ course, onSaved, onDeleted }: Props) {
  const [visibility, setVisibility] = useState(course.visibility || "draft");
  const [enrollmentType, setEnrollmentType] = useState(course.enrollment_type || "open");
  const [certificate, setCertificate] = useState(course.certificate_enabled || false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("courses").update({
      visibility, enrollment_type: enrollmentType, certificate_enabled: certificate,
      updated_at: new Date().toISOString(),
    }).eq("id", course.id);
    if (error) { toast.error("שגיאה בשמירה"); } else { toast.success("ההגדרות נשמרו"); onSaved(); }
    setSaving(false);
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("courses").delete().eq("id", course.id);
    if (error) { toast.error("שגיאה במחיקה"); return; }
    toast.success("הקורס נמחק");
    onDeleted();
  };

  const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <label className="text-sm mb-1.5 block" style={{ color: "#b8b8b8" }}>נראות הקורס</label>
        <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="w-full h-10 rounded-xl text-sm px-3 outline-none font-outfit" style={inputStyle}>
          <option value="public">ציבורי</option>
          <option value="draft">טיוטה</option>
          <option value="hidden">מוסתר</option>
        </select>
      </div>
      <div>
        <label className="text-sm mb-1.5 block" style={{ color: "#b8b8b8" }}>סוג הרשמה</label>
        <select value={enrollmentType} onChange={(e) => setEnrollmentType(e.target.value)} className="w-full h-10 rounded-xl text-sm px-3 outline-none font-outfit" style={inputStyle}>
          <option value="open">פתוח לכולם</option>
          <option value="invite">בהזמנה בלבד</option>
        </select>
      </div>
      <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div>
          <p className="text-sm font-medium font-outfit">תעודת סיום</p>
          <p className="text-xs" style={{ color: "#888" }}>הפעל תעודת סיום אוטומטית לסיום הקורס</p>
        </div>
        <Switch checked={certificate} onCheckedChange={setCertificate} />
      </div>

      <Button onClick={handleSave} disabled={saving} className="font-outfit font-semibold" style={{ background: "#ffbd02", color: "rgb(36,36,34)" }}>
        {saving ? "שומר..." : "שמור הגדרות"}
      </Button>

      <div className="pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {!confirmDelete ? (
          <Button variant="outline" onClick={() => setConfirmDelete(true)} className="font-outfit" style={{ borderColor: "rgba(239,68,68,0.3)", color: "#f87171" }}>
            <Trash2 className="w-4 h-4 ml-2" /> מחק קורס
          </Button>
        ) : (
          <div className="p-4 rounded-xl space-y-3" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="text-sm" style={{ color: "#f87171" }}>האם אתה בטוח? פעולה זו תמחק את הקורס וכל התוכן שלו לצמיתות.</p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)} className="font-outfit" style={{ borderColor: "rgba(255,255,255,0.1)", color: "#b8b8b8" }}>ביטול</Button>
              <Button size="sm" onClick={handleDelete} className="font-outfit" style={{ background: "#ef4444", color: "#fff" }}>מחק לצמיתות</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
