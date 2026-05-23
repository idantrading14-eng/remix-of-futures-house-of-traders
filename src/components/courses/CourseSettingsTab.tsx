import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  course: any;
  onSaved: () => void;
  onDeleted: () => void;
};

export default function CourseSettingsTab({ course, onSaved, onDeleted }: Props) {
  const [visibility, setVisibility] = useState(course.visibility || "draft");
  const [enrollmentType, setEnrollmentType] = useState(course.enrollment_type || "open");
  const [certificate, setCertificate] = useState(course.certificate_enabled || false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("courses").update({
      visibility,
      enrollment_type: enrollmentType,
      certificate_enabled: certificate,
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

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <label className="text-sm text-gray-400 mb-1.5 block">נראות הקורס</label>
        <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="w-full h-10 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm px-3 outline-none">
          <option value="public">ציבורי</option>
          <option value="draft">טיוטה</option>
          <option value="hidden">מוסתר</option>
        </select>
      </div>
      <div>
        <label className="text-sm text-gray-400 mb-1.5 block">סוג הרשמה</label>
        <select value={enrollmentType} onChange={(e) => setEnrollmentType(e.target.value)} className="w-full h-10 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm px-3 outline-none">
          <option value="open">פתוח לכולם</option>
          <option value="invite">בהזמנה בלבד</option>
        </select>
      </div>
      <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <div>
          <p className="text-sm text-white font-medium">תעודת סיום</p>
          <p className="text-xs text-gray-500">הפעל תעודת סיום אוטומטית לסיום הקורס</p>
        </div>
        <Switch checked={certificate} onCheckedChange={setCertificate} />
      </div>

      <Button onClick={handleSave} disabled={saving} className="bg-indigo-500 hover:bg-indigo-400 text-white">
        {saving ? "שומר..." : "שמור הגדרות"}
      </Button>

      <div className="border-t border-white/[0.06] pt-6">
        {!confirmDelete ? (
          <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="w-4 h-4 ml-2" /> מחק קורס
          </Button>
        ) : (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 space-y-3">
            <p className="text-sm text-red-400">האם אתה בטוח? פעולה זו תמחק את הקורס וכל התוכן שלו לצמיתות.</p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="border-white/10 text-gray-400" onClick={() => setConfirmDelete(false)}>ביטול</Button>
              <Button size="sm" className="bg-red-500 hover:bg-red-400 text-white" onClick={handleDelete}>מחק לצמיתות</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
