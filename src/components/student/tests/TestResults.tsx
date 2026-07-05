import { Check, X, RotateCcw, ChevronLeft } from "lucide-react";
import type { Level, AnswerValue, Question } from "./types";
import { isCorrect } from "./types";

interface Props {
  level: Level;
  answers: AnswerValue[];
  onRetake: () => void;
  onBack: () => void;
}

function formatAnswer(q: Question, a: AnswerValue): string {
  if (q.type === "multiple_choice" && a.type === "multiple_choice")
    return a.selectedIndex !== null ? q.options[a.selectedIndex] : "—";
  if (q.type === "true_false" && a.type === "true_false")
    return a.value === null ? "—" : a.value ? "נכון" : "לא נכון";
  if (q.type === "image_choice" && a.type === "image_choice")
    return a.selectedIndex !== null ? (q.options[a.selectedIndex].label || `אפשרות ${a.selectedIndex + 1}`) : "—";
  if (q.type === "drawing" && a.type === "drawing")
    return a.selfGraded === null ? "—" : a.selfGraded ? "דורג כנכון" : "דורג כלא נכון";
  if (q.type === "short_text" && a.type === "short_text")
    return a.text || "—";
  return "—";
}

function formatCorrect(q: Question): string {
  switch (q.type) {
    case "multiple_choice": return q.options[q.correctIndex];
    case "true_false": return q.correct ? "נכון" : "לא נכון";
    case "image_choice": return q.options[q.correctIndex].label || `אפשרות ${q.correctIndex + 1}`;
    case "drawing": return "ראה תמונת דוגמה";
    case "short_text": return q.accepted[0];
  }
}

export default function TestResults({ level, answers, onRetake, onBack }: Props) {
  const total = level.questions.length;
  const score = level.questions.reduce((acc, q, i) => acc + (isCorrect(q, answers[i]) ? 1 : 0), 0);
  const pct = Math.round((score / total) * 100);
  const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#d4a017" : "#ef4444";

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1 text-xs mb-4" style={{ color: "#888" }}>
        <ChevronLeft className="w-4 h-4" /> חזור לרמות
      </button>

      <div
        className="p-8 rounded-2xl mb-6 text-center"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-sm mb-2" style={{ color: "#888" }}>הציון שלך ב{level.title}</p>
        <div className="text-6xl font-bold font-outfit mb-2" style={{ color }}>
          {score}/{total}
        </div>
        <p className="text-lg" style={{ color }}>{pct}%</p>
        <button
          onClick={onRetake}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: "#d4a017", color: "#111" }}
        >
          <RotateCcw className="w-4 h-4" /> נסה שוב
        </button>
      </div>

      <h3 className="text-lg font-bold font-outfit text-white mb-3">סקירת תשובות</h3>
      <div className="space-y-3">
        {level.questions.map((q, i) => {
          const correct = isCorrect(q, answers[i]);
          return (
            <div
              key={q.id}
              className="p-4 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${correct ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: correct ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)" }}
                >
                  {correct ? (
                    <Check className="w-4 h-4" style={{ color: "#22c55e" }} />
                  ) : (
                    <X className="w-4 h-4" style={{ color: "#ef4444" }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white mb-2">
                    {i + 1}. {q.prompt}
                  </p>
                  <div className="space-y-1 text-xs">
                    <p>
                      <span style={{ color: "#888" }}>התשובה שלך: </span>
                      <span style={{ color: correct ? "#22c55e" : "#ef4444" }}>{formatAnswer(q, answers[i])}</span>
                    </p>
                    {!correct && (
                      <p>
                        <span style={{ color: "#888" }}>התשובה הנכונה: </span>
                        <span style={{ color: "#22c55e" }}>{formatCorrect(q)}</span>
                      </p>
                    )}
                    {q.explanation && (
                      <p className="mt-2 p-2 rounded-lg" style={{ background: "rgba(212,160,23,0.06)", color: "#e5c76b" }}>
                        {q.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
