import { useState } from "react";
import { Eye, Pencil } from "lucide-react";
import type { Question, AnswerValue } from "@/components/student/tests/types";
import { emptyAnswer } from "@/components/student/tests/types";
import QuestionEditor from "./QuestionEditor";
import MultipleChoiceQuestion from "@/components/student/tests/questions/MultipleChoiceQuestion";
import TrueFalseQuestion from "@/components/student/tests/questions/TrueFalseQuestion";
import ImageChoiceQuestion from "@/components/student/tests/questions/ImageChoiceQuestion";
import DrawingQuestion from "@/components/student/tests/questions/DrawingQuestion";
import ShortTextQuestion from "@/components/student/tests/questions/ShortTextQuestion";

interface Props {
  question: Question;
  onChange: (q: Question) => void;
}

export default function QuestionEditorWithPreview({ question, onChange }: Props) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [previewAnswer, setPreviewAnswer] = useState<AnswerValue>(() => emptyAnswer(question));

  // Reset preview answer when question type changes
  const previewAnswerForType: AnswerValue =
    previewAnswer.type === question.type ? previewAnswer : emptyAnswer(question);

  const renderPreview = () => {
    switch (question.type) {
      case "multiple_choice":
        return <MultipleChoiceQuestion question={question} value={previewAnswerForType as any} onChange={setPreviewAnswer} />;
      case "true_false":
        return <TrueFalseQuestion question={question} value={previewAnswerForType as any} onChange={setPreviewAnswer} />;
      case "image_choice":
        return <ImageChoiceQuestion question={question} value={previewAnswerForType as any} onChange={setPreviewAnswer} />;
      case "drawing":
        return <DrawingQuestion question={question} value={previewAnswerForType as any} onChange={setPreviewAnswer} />;
      case "short_text":
        return <ShortTextQuestion question={question} value={previewAnswerForType as any} onChange={setPreviewAnswer} />;
    }
  };

  return (
    <div>
      <div className="flex gap-1 mb-4 p-1 rounded-lg w-fit" style={{ background: "rgba(255,255,255,0.04)" }}>
        <button
          onClick={() => setMode("edit")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
          style={{ background: mode === "edit" ? "#d4a017" : "transparent", color: mode === "edit" ? "#111" : "#aaa" }}
        >
          <Pencil className="w-3.5 h-3.5" /> עריכה
        </button>
        <button
          onClick={() => setMode("preview")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
          style={{ background: mode === "preview" ? "#d4a017" : "transparent", color: mode === "preview" ? "#111" : "#aaa" }}
        >
          <Eye className="w-3.5 h-3.5" /> תצוגה מקדימה
        </button>
      </div>

      {mode === "edit" ? (
        <QuestionEditor question={question} onChange={onChange} />
      ) : (
        <div className="p-5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {renderPreview()}
        </div>
      )}
    </div>
  );
}
