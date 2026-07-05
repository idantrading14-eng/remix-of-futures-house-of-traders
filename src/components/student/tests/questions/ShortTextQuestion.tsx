import QuestionShell from "./QuestionShell";
import type { ShortTextQ, AnswerValue } from "../types";

interface Props {
  question: ShortTextQ;
  value: Extract<AnswerValue, { type: "short_text" }>;
  onChange: (v: Extract<AnswerValue, { type: "short_text" }>) => void;
  disabled?: boolean;
}

export default function ShortTextQuestion({ question, value, onChange, disabled }: Props) {
  return (
    <QuestionShell question={question}>
      <input
        type="text"
        disabled={disabled}
        value={value.text}
        onChange={(e) => onChange({ type: "short_text", text: e.target.value })}
        placeholder="הקלד תשובה..."
        className="w-full px-4 py-3 rounded-xl text-base outline-none text-right"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#fff",
        }}
      />
    </QuestionShell>
  );
}
