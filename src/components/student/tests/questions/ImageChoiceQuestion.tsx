import QuestionShell from "./QuestionShell";
import TestImage from "../TestImage";
import type { ImageChoiceQ, AnswerValue } from "../types";

interface Props {
  question: ImageChoiceQ;
  value: Extract<AnswerValue, { type: "image_choice" }>;
  onChange: (v: Extract<AnswerValue, { type: "image_choice" }>) => void;
  disabled?: boolean;
}

export default function ImageChoiceQuestion({ question, value, onChange, disabled }: Props) {
  return (
    <QuestionShell question={question}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {question.options.map((opt, i) => {
          const selected = value.selectedIndex === i;
          return (
            <button
              key={i}
              disabled={disabled}
              onClick={() => onChange({ type: "image_choice", selectedIndex: i })}
              className="rounded-xl overflow-hidden transition-all text-right"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `2px solid ${selected ? "#d4a017" : "rgba(255,255,255,0.08)"}`,
              }}
            >
              {opt.image && (
                <TestImage src={opt.image} alt={opt.label || ""} className="w-full h-40 object-cover" />
              )}
              {opt.label && (
                <div className="p-3 text-sm" style={{ color: selected ? "#d4a017" : "#ddd" }}>
                  {opt.label}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </QuestionShell>
  );
}
