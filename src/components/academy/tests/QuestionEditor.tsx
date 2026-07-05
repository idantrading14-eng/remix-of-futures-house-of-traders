import { Plus, Trash2 } from "lucide-react";
import TestImageInput from "./TestImageInput";
import type { Question } from "@/components/student/tests/types";

interface Props {
  question: Question;
  onChange: (q: Question) => void;
}

const inputClass = "w-full px-3 py-2 rounded-lg text-sm outline-none text-right";
const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff",
};

export default function QuestionEditor({ question, onChange }: Props) {
  const patch = <T extends Question>(u: Partial<T>) => onChange({ ...(question as T), ...u } as Question);

  return (
    <div className="space-y-4">
      {/* Type selector */}
      <div>
        <label className="text-xs font-semibold block mb-2" style={{ color: "#888" }}>סוג שאלה</label>
        <select
          value={question.type}
          onChange={(e) => {
            const t = e.target.value as Question["type"];
            const base = { id: question.id, prompt: question.prompt, image: question.image, hint: question.hint, explanation: question.explanation };
            let next: Question;
            switch (t) {
              case "multiple_choice": next = { ...base, type: "multiple_choice", options: ["", ""], correctIndex: 0 }; break;
              case "true_false": next = { ...base, type: "true_false", correct: true }; break;
              case "image_choice": next = { ...base, type: "image_choice", options: [{ label: "" }, { label: "" }], correctIndex: 0 }; break;
              case "drawing": next = { ...base, type: "drawing", correctAnswerImage: "" }; break;
              case "short_text": next = { ...base, type: "short_text", accepted: [""] }; break;
            }
            onChange(next);
          }}
          className={inputClass}
          style={inputStyle}
        >
          <option value="multiple_choice">רב-ברירה (American)</option>
          <option value="true_false">נכון / לא נכון</option>
          <option value="image_choice">בחירת תמונה</option>
          <option value="drawing">ציור</option>
          <option value="short_text">תשובה קצרה</option>
        </select>
      </div>

      {/* Prompt */}
      <div>
        <label className="text-xs font-semibold block mb-2" style={{ color: "#888" }}>שאלה</label>
        <textarea
          value={question.prompt}
          onChange={(e) => patch({ prompt: e.target.value })}
          rows={2}
          className={inputClass}
          style={inputStyle}
        />
      </div>

      {/* Optional question image */}
      <TestImageInput value={question.image || null} onChange={(v) => patch({ image: v || undefined })} label="תמונה לשאלה (אופציונלי)" />

      {/* Type-specific */}
      {question.type === "multiple_choice" && (
        <div>
          <label className="text-xs font-semibold block mb-2" style={{ color: "#888" }}>תשובות אפשריות (סמן את הנכונה)</label>
          <div className="space-y-2">
            {question.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={question.correctIndex === i}
                  onChange={() => patch({ correctIndex: i })}
                  className="w-4 h-4 accent-yellow-500"
                />
                <input
                  value={opt}
                  onChange={(e) => {
                    const next = [...question.options]; next[i] = e.target.value;
                    patch({ options: next });
                  }}
                  className={inputClass}
                  style={inputStyle}
                  placeholder={`אפשרות ${i + 1}`}
                />
                {question.options.length > 2 && (
                  <button
                    onClick={() => {
                      const next = question.options.filter((_, j) => j !== i);
                      const ci = question.correctIndex >= next.length ? next.length - 1 : question.correctIndex;
                      patch({ options: next, correctIndex: ci });
                    }}
                    className="p-2 rounded-lg" style={{ color: "#ef4444" }}
                  ><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            ))}
            {question.options.length < 5 && (
              <button
                onClick={() => patch({ options: [...question.options, ""] })}
                className="flex items-center gap-1 text-xs" style={{ color: "#d4a017" }}
              ><Plus className="w-3.5 h-3.5" /> הוסף אפשרות</button>
            )}
          </div>
        </div>
      )}

      {question.type === "true_false" && (
        <div>
          <label className="text-xs font-semibold block mb-2" style={{ color: "#888" }}>התשובה הנכונה</label>
          <div className="flex gap-2">
            {[true, false].map(v => (
              <button
                key={String(v)}
                onClick={() => patch({ correct: v })}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                style={{
                  background: question.correct === v ? "rgba(212,160,23,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${question.correct === v ? "#d4a017" : "rgba(255,255,255,0.08)"}`,
                  color: question.correct === v ? "#d4a017" : "#ddd",
                }}
              >{v ? "נכון" : "לא נכון"}</button>
            ))}
          </div>
        </div>
      )}

      {question.type === "image_choice" && (
        <div>
          <label className="text-xs font-semibold block mb-2" style={{ color: "#888" }}>תמונות / אפשרויות (סמן את הנכונה)</label>
          <div className="space-y-3">
            {question.options.map((opt, i) => (
              <div key={i} className="p-3 rounded-lg space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={question.correctIndex === i}
                    onChange={() => patch({ correctIndex: i })}
                    className="w-4 h-4 accent-yellow-500"
                  />
                  <input
                    value={opt.label || ""}
                    onChange={(e) => {
                      const next = [...question.options]; next[i] = { ...next[i], label: e.target.value };
                      patch({ options: next });
                    }}
                    placeholder="תיאור/טקסט (אופציונלי)"
                    className={inputClass}
                    style={inputStyle}
                  />
                  {question.options.length > 2 && (
                    <button
                      onClick={() => {
                        const next = question.options.filter((_, j) => j !== i);
                        const ci = question.correctIndex >= next.length ? next.length - 1 : question.correctIndex;
                        patch({ options: next, correctIndex: ci });
                      }}
                      className="p-2 rounded-lg" style={{ color: "#ef4444" }}
                    ><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
                <TestImageInput
                  value={opt.image || null}
                  onChange={(v) => {
                    const next = [...question.options]; next[i] = { ...next[i], image: v || undefined };
                    patch({ options: next });
                  }}
                  label={`תמונה ${i + 1}`}
                />
              </div>
            ))}
            {question.options.length < 5 && (
              <button
                onClick={() => patch({ options: [...question.options, { label: "" }] })}
                className="flex items-center gap-1 text-xs" style={{ color: "#d4a017" }}
              ><Plus className="w-3.5 h-3.5" /> הוסף אפשרות</button>
            )}
          </div>
        </div>
      )}

      {question.type === "drawing" && (
        <TestImageInput
          value={question.correctAnswerImage || null}
          onChange={(v) => patch({ correctAnswerImage: v || "" })}
          label="תמונת התשובה הנכונה (התלמיד ישווה לציור שלו)"
        />
      )}

      {question.type === "short_text" && (
        <div>
          <label className="text-xs font-semibold block mb-2" style={{ color: "#888" }}>תשובות מקובלות (case-insensitive)</label>
          <div className="space-y-2">
            {question.accepted.map((val, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={val}
                  onChange={(e) => {
                    const next = [...question.accepted]; next[i] = e.target.value;
                    patch({ accepted: next });
                  }}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="תשובה מקובלת"
                />
                {question.accepted.length > 1 && (
                  <button
                    onClick={() => patch({ accepted: question.accepted.filter((_, j) => j !== i) })}
                    className="p-2 rounded-lg" style={{ color: "#ef4444" }}
                  ><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            ))}
            <button
              onClick={() => patch({ accepted: [...question.accepted, ""] })}
              className="flex items-center gap-1 text-xs" style={{ color: "#d4a017" }}
            ><Plus className="w-3.5 h-3.5" /> הוסף תשובה מקובלת</button>
          </div>
        </div>
      )}

      {/* Hint + Explanation */}
      <div>
        <label className="text-xs font-semibold block mb-2" style={{ color: "#888" }}>רמז (אופציונלי)</label>
        <input
          value={question.hint || ""}
          onChange={(e) => patch({ hint: e.target.value || undefined })}
          className={inputClass}
          style={inputStyle}
        />
      </div>
      <div>
        <label className="text-xs font-semibold block mb-2" style={{ color: "#888" }}>הסבר לאחר תשובה (אופציונלי)</label>
        <textarea
          value={question.explanation || ""}
          onChange={(e) => patch({ explanation: e.target.value || undefined })}
          rows={2}
          className={inputClass}
          style={inputStyle}
        />
      </div>
    </div>
  );
}
