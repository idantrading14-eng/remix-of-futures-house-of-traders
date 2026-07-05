import { Check, X } from "lucide-react";
import QuestionShell from "./QuestionShell";
import type { TrueFalseQ, AnswerValue } from "../types";

interface Props {
  question: TrueFalseQ;
  value: Extract<AnswerValue, { type: "true_false" }>;
  onChange: (v: Extract<AnswerValue, { type: "true_false" }>) => void;
  disabled?: boolean;
}

export default function TrueFalseQuestion({ question, value, onChange, disabled }: Props) {
  const btn = (label: string, val: boolean, icon: React.ReactNode) => {
    const selected = value.value === val;
    return (
      <button
        disabled={disabled}
        onClick={() => onChange({ type: "true_false", value: val })}
        className="flex-1 p-5 rounded-xl transition-all flex flex-col items-center gap-2"
        style={{
          background: selected ? "rgba(212,160,23,0.12)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${selected ? "#d4a017" : "rgba(255,255,255,0.08)"}`,
          color: selected ? "#d4a017" : "#ddd",
        }}
      >
        {icon}
        <span className="text-base font-semibold">{label}</span>
      </button>
    );
  };
  return (
    <QuestionShell question={question}>
      <div className="flex gap-3">
        {btn("נכון", true, <Check className="w-6 h-6" />)}
        {btn("לא נכון", false, <X className="w-6 h-6" />)}
      </div>
    </QuestionShell>
  );
}
