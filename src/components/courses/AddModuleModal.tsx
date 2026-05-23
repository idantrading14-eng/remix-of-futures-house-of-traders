import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Module = { id: string; title: string; description: string; thumbnail_url: string | null; access_level: string; notes?: string };

type Props = {
  courseId: string;
  module?: Module;
  sortOrder: number;
  onClose: () => void;
  onSaved: () => void;
};

export default function AddModuleModal({ courseId, module, sortOrder, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(module?.title || "");
  const [description, setDescription] = useState(module?.description || "");
  const [accessLevel, setAccessLevel] = useState(module?.access_level || "open");
  const [notes, setNotes] = useState(module?.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) { toast.error("נא להזין שם מודול"); return; }
    setSaving(true);
    const payload = { title: title.trim(), description, access_level: accessLevel, notes: notes || "" };

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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#12121f] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">{module ? "עריכת מודול" : "מודול חדש"}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">שם המודול</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white/[0.04] border-white/10 text-white" />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">תיאור</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white/[0.04] border-white/10 text-white min-h-[60px]" />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">הערות (יוצגו לתלמידים)</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-white/[0.04] border-white/10 text-white min-h-[60px]" placeholder="הערות, טיפים או מידע נוסף..." />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">רמת גישה</label>
            <select value={accessLevel} onChange={(e) => setAccessLevel(e.target.value)} className="w-full h-10 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm px-3 outline-none">
              <option value="open">פתוח</option>
              <option value="pro">PRO בלבד</option>
              <option value="locked">נעול</option>
            </select>
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
