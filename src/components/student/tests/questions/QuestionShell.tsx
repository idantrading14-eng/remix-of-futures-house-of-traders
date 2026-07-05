import { useState } from "react";
import { Lightbulb } from "lucide-react";
import type { Question } from "../types";
import TestImage from "../TestImage";

export default function QuestionShell({ question, children }: { question: Question; children: React.ReactNode }) {
  const [showHint, setShowHint] = useState(false);
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl md:text-2xl font-bold font-outfit text-white leading-relaxed">
          {question.prompt}
        </h2>
        {question.image && (
          <TestImage
            src={question.image}
            alt=""
            className="mt-4 rounded-xl max-h-64 object-contain"
            style={{ background: "rgba(255,255,255,0.03)" }}
          />
        )}
      </div>

      {children}

      {question.hint && (
        <div>
          <button
            onClick={() => setShowHint(v => !v)}
            className="inline-flex items-center gap-2 text-xs"
            style={{ color: "#d4a017" }}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            {showHint ? "הסתר רמז" : "הצג רמז"}
          </button>
          {showHint && (
            <p className="mt-2 text-sm p-3 rounded-lg" style={{ background: "rgba(212,160,23,0.08)", color: "#e5c76b" }}>
              {question.hint}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
