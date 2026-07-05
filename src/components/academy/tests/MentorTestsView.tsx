import { useEffect, useState } from "react";
import { ClipboardCheck, Plus, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LevelEditor from "./LevelEditor";

type LevelRow = { id: string; title: string; sort_order: number; question_count: number };

export default function MentorTestsView() {
  const [levels, setLevels] = useState<LevelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("test_levels")
      .select("id, title, sort_order, questions")
      .order("sort_order", { ascending: true });
    if (error) { toast.error(error.message); setLoading(false); return; }
    setLevels((data || []).map((r: any) => ({
      id: r.id, title: r.title, sort_order: r.sort_order,
      question_count: Array.isArray(r.questions) ? r.questions.length : 0,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createLevel = async () => {
    const title = prompt("שם הרמה החדשה:");
    if (!title) return;
    const nextOrder = levels.length ? Math.max(...levels.map(l => l.sort_order)) + 1 : 1;
    const { data, error } = await supabase
      .from("test_levels")
      .insert({ title, sort_order: nextOrder, questions: [] })
      .select("id")
      .single();
    if (error) { toast.error(error.message); return; }
    toast.success("רמה נוצרה");
    setEditingId(data.id as string);
  };

  const deleteLevel = async (id: string) => {
    if (!confirm("למחוק את הרמה וכל השאלות שלה?")) return;
    const { error } = await supabase.from("test_levels").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("נמחק");
    load();
  };

  if (editingId) {
    return <LevelEditor levelId={editingId} onBack={() => { setEditingId(null); load(); }} />;
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-outfit">מבחנים</h1>
          <p className="text-xs mt-1" style={{ color: "#888" }}>ניהול רמות ושאלות למבחני התלמידים</p>
        </div>
        <button
          onClick={createLevel}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
          style={{ background: "#ffbd02", color: "rgb(36,36,34)" }}
        >
          <Plus className="w-4 h-4" /> רמה חדשה
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: "#888" }}>טוען...</div>
      ) : levels.length === 0 ? (
        <div className="text-center py-20">
          <ClipboardCheck className="w-16 h-16 mx-auto mb-3" style={{ color: "rgba(255,189,2,0.3)" }} />
          <p style={{ color: "#888" }}>עוד אין רמות. צור רמה ראשונה!</p>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {levels.map(l => (
            <div key={l.id} className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,189,2,0.12)" }}>
                  <ClipboardCheck className="w-5 h-5" style={{ color: "#ffbd02" }} />
                </div>
                <span className="text-xs" style={{ color: "#666" }}>#{l.sort_order}</span>
              </div>
              <h3 className="font-bold font-outfit text-base mb-1">{l.title}</h3>
              <p className="text-xs mb-4" style={{ color: "#888" }}>{l.question_count} שאלות</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingId(l.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: "rgba(255,189,2,0.12)", color: "#ffbd02" }}
                >
                  <Pencil className="w-3.5 h-3.5" /> ערוך
                </button>
                <button
                  onClick={() => deleteLevel(l.id)}
                  className="p-2 rounded-lg"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
