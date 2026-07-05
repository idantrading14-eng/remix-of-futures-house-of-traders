import QuestionShell from "./QuestionShell";
import type { MultipleChoiceQ, AnswerValue } from "../types";

interface Props {
  question: MultipleChoiceQ;
  value: Extract<AnswerValue, { type: "multiple_choice" }>;
  onChange: (v: Extract<AnswerValue, { type: "multiple_choice" }>) => void;
  disabled?: boolean;
}

export default function MultipleChoiceQuestion({ question, value, onChange, disabled }: Props) {
  return (
    <QuestionShell question={question}>
      <div className="space-y-2.5">
        {question.options.map((opt, i) => {
          const selected = value.selectedIndex === i;
          return (
            <button
              key={i}
              disabled={disabled}
              onClick={() => onChange({ type: "multiple_choice", selectedIndex: i })}
              className="w-full text-right p-4 rounded-xl transition-all flex items-center gap-3"
              style={{
                background: selected ? "rgba(212,160,23,0.12)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${selected ? "#d4a017" : "rgba(255,255,255,0.08)"}`,
                color: selected ? "#fff" : "#ddd",
              }}
            >
              <div
                className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
                style={{ border: `2px solid ${selected ? "#d4a017" : "#555"}` }}
              >
                {selected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#d4a017" }} />}
              </div>
              <span className="text-sm md:text-base">{opt}</span>
            </button>
          );
        })}
      </div>
    </QuestionShell>
  );
}
