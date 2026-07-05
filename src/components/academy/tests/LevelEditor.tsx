import { useEffect, useState } from "react";
import { ChevronLeft, Plus, Trash2, Save, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Question, Level } from "@/components/student/tests/types";
import QuestionEditorWithPreview from "./QuestionEditorWithPreview";

interface Props {
  levelId: string;
  onBack: () => void;
}

const emptyQuestion = (): Question => ({
  id: `q-${crypto.randomUUID().slice(0, 8)}`,
  type: "multiple_choice",
  prompt: "",
  options: ["", ""],
  correctIndex: 0,
});

export default function LevelEditor({ levelId, onBack }: Props) {
  const [level, setLevel] = useState<Level | null>(null);
  const [sortOrder, setSortOrder] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("test_levels")
        .select("id, title, questions, sort_order")
        .eq("id", levelId)
        .single();
      if (error || !data) {
        toast.error("שגיאה בטעינת הרמה");
        onBack();
        return;
      }
      setLevel({
        id: data.id as string,
        title: data.title as string,
        questions: ((data.questions as unknown) as Question[]) || [],
      });
      setSortOrder((data.sort_order as number) || 0);
      setLoading(false);
    })();
  }, [levelId]);

  const save = async () => {
    if (!level) return;
    setSaving(true);
    const { error } = await supabase
      .from("test_levels")
      .update({ title: level.title, questions: level.questions as any, sort_order: sortOrder })
      .eq("id", level.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("נשמר בהצלחה");
  };

  const addQuestion = () => {
    if (!level) return;
    const q = emptyQuestion();
    setLevel({ ...level, questions: [...level.questions, q] });
    setExpanded(q.id);
  };
  const removeQuestion = (id: string) => {
    if (!level) return;
    if (!confirm("למחוק את השאלה?")) return;
    setLevel({ ...level, questions: level.questions.filter(q => q.id !== id) });
  };
  const updateQuestion = (id: string, q: Question) => {
    if (!level) return;
    setLevel({ ...level, questions: level.questions.map(x => x.id === id ? q : x) });
  };
  const move = (id: string, dir: -1 | 1) => {
    if (!level) return;
    const i = level.questions.findIndex(q => q.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= level.questions.length) return;
    const next = [...level.questions];
    [next[i], next[j]] = [next[j], next[i]];
    setLevel({ ...level, questions: next });
  };

  if (loading || !level) {
    return <div className="p-10 text-center" style={{ color: "#888" }}>טוען...</div>;
  }

  return (
    <div className="h-full overflow-auto p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-1 text-sm" style={{ color: "#888" }}>
          <ChevronLeft className="w-4 h-4" /> חזור לרמות
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          style={{ background: "#ffbd02", color: "rgb(36,36,34)" }}
        >
          <Save className="w-4 h-4" /> {saving ? "שומר..." : "שמור שינויים"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="md:col-span-2">
          <label className="text-xs font-semibold block mb-2" style={{ color: "#888" }}>שם הרמה</label>
          <input
            value={level.title}
            onChange={(e) => setLevel({ ...level, title: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none text-right"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
          />
        </div>
        <div>
          <label className="text-xs font-semibold block mb-2" style={{ color: "#888" }}>סדר תצוגה</label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none text-right"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold" style={{ color: "#ddd" }}>שאלות ({level.questions.length})</h3>
        <button
          onClick={addQuestion}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: "rgba(255,189,2,0.15)", color: "#ffbd02" }}
        >
          <Plus className="w-3.5 h-3.5" /> הוסף שאלה
        </button>
      </div>

      <div className="space-y-3">
        {level.questions.map((q, i) => {
          const open = expanded === q.id;
          return (
            <div key={q.id} className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 p-3">
                <span className="text-xs font-bold w-6 text-center" style={{ color: "#888" }}>{i + 1}</span>
                <button
                  onClick={() => setExpanded(open ? null : q.id)}
                  className="flex-1 min-w-0 text-right"
                >
                  <p className="text-sm font-semibold truncate" style={{ color: "#fff" }}>
                    {q.prompt || <span style={{ color: "#666" }}>שאלה ללא כותרת</span>}
                  </p>
                  <p className="text-xs" style={{ color: "#666" }}>{typeLabel(q.type)}</p>
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={() => move(q.id, -1)} disabled={i === 0} className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: "#aaa" }}><ChevronUp className="w-4 h-4" /></button>
                  <button onClick={() => move(q.id, 1)} disabled={i === level.questions.length - 1} className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: "#aaa" }}><ChevronDown className="w-4 h-4" /></button>
                  <button onClick={() => removeQuestion(q.id)} className="p-1.5 rounded-lg" style={{ color: "#ef4444" }}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {open && (
                <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <QuestionEditorWithPreview question={q} onChange={(nq) => updateQuestion(q.id, nq)} />
                </div>
              )}
            </div>
          );
        })}
        {level.questions.length === 0 && (
          <div className="text-center py-10 text-sm" style={{ color: "#666" }}>אין עדיין שאלות. הוסף שאלה ראשונה!</div>
        )}
      </div>
    </div>
  );
}

function typeLabel(t: Question["type"]) {
  switch (t) {
    case "multiple_choice": return "רב-ברירה";
    case "true_false": return "נכון / לא נכון";
    case "image_choice": return "בחירת תמונה";
    case "drawing": return "ציור";
    case "short_text": return "תשובה קצרה";
  }
}
