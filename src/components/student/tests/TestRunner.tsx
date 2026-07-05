import { useState } from "react";
import { ArrowRight, ChevronLeft } from "lucide-react";
import type { Level, AnswerValue } from "./types";
import { emptyAnswer, isAnswered } from "./types";
import MultipleChoiceQuestion from "./questions/MultipleChoiceQuestion";
import TrueFalseQuestion from "./questions/TrueFalseQuestion";
import ImageChoiceQuestion from "./questions/ImageChoiceQuestion";
import DrawingQuestion from "./questions/DrawingQuestion";
import ShortTextQuestion from "./questions/ShortTextQuestion";

interface Props {
  level: Level;
  onFinish: (answers: AnswerValue[]) => void;
  onBack: () => void;
}

export default function TestRunner({ level, onFinish, onBack }: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerValue[]>(() => level.questions.map(emptyAnswer));

  const q = level.questions[index];
  const a = answers[index];
  const isLast = index === level.questions.length - 1;
  const answered = isAnswered(q, a);

  const setAnswer = (v: AnswerValue) => {
    const next = [...answers];
    next[index] = v;
    setAnswers(next);
  };

  const advance = () => {
    if (isLast) onFinish(answers);
    else setIndex(i => i + 1);
  };

  const renderQuestion = () => {
    switch (q.type) {
      case "multiple_choice":
        return <MultipleChoiceQuestion question={q} value={a as any} onChange={setAnswer} />;
      case "true_false":
        return <TrueFalseQuestion question={q} value={a as any} onChange={setAnswer} />;
      case "image_choice":
        return <ImageChoiceQuestion question={q} value={a as any} onChange={setAnswer} />;
      case "drawing":
        return <DrawingQuestion question={q} value={a as any} onChange={setAnswer} />;
      case "short_text":
        return <ShortTextQuestion question={q} value={a as any} onChange={setAnswer} />;
    }
  };

  const progress = ((index + 1) / level.questions.length) * 100;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs"
            style={{ color: "#888" }}
          >
            <ChevronLeft className="w-4 h-4" /> חזור לרמות
          </button>
          <span className="text-xs font-semibold" style={{ color: "#d4a017" }}>
            שאלה {index + 1} מתוך {level.questions.length}
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${progress}%`, background: "#d4a017" }}
          />
        </div>
      </div>

      <div
        className="p-5 md:p-7 rounded-2xl mb-5"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {renderQuestion()}
      </div>

      <button
        onClick={advance}
        disabled={!answered}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
        style={{ background: "#d4a017", color: "#111" }}
      >
        {isLast ? "סיום מבחן" : "הבא"}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
