export type BaseQuestion = {
  id: string;
  prompt: string;
  image?: string;
  hint?: string;
  explanation?: string;
};

export type MultipleChoiceQ = BaseQuestion & {
  type: "multiple_choice";
  options: string[];
  correctIndex: number;
};

export type TrueFalseQ = BaseQuestion & {
  type: "true_false";
  correct: boolean;
};

export type ImageChoiceQ = BaseQuestion & {
  type: "image_choice";
  options: { label?: string; image?: string }[];
  correctIndex: number;
};

export type DrawingQ = BaseQuestion & {
  type: "drawing";
  correctAnswerImage: string;
};

export type ShortTextQ = BaseQuestion & {
  type: "short_text";
  accepted: string[];
};

export type Question =
  | MultipleChoiceQ
  | TrueFalseQ
  | ImageChoiceQ
  | DrawingQ
  | ShortTextQ;

export type Level = {
  id: string;
  title: string;
  questions: Question[];
};

/** Answer value stored per question. Shape depends on question type. */
export type AnswerValue =
  | { type: "multiple_choice"; selectedIndex: number | null }
  | { type: "true_false"; value: boolean | null }
  | { type: "image_choice"; selectedIndex: number | null }
  | { type: "drawing"; dataUrl: string | null; selfGraded: boolean | null }
  | { type: "short_text"; text: string };

export function emptyAnswer(q: Question): AnswerValue {
  switch (q.type) {
    case "multiple_choice": return { type: "multiple_choice", selectedIndex: null };
    case "true_false": return { type: "true_false", value: null };
    case "image_choice": return { type: "image_choice", selectedIndex: null };
    case "drawing": return { type: "drawing", dataUrl: null, selfGraded: null };
    case "short_text": return { type: "short_text", text: "" };
  }
}

export function isAnswered(q: Question, a: AnswerValue): boolean {
  switch (a.type) {
    case "multiple_choice": return a.selectedIndex !== null;
    case "true_false": return a.value !== null;
    case "image_choice": return a.selectedIndex !== null;
    case "drawing": return a.selfGraded !== null;
    case "short_text": return a.text.trim().length > 0;
  }
}

export function isCorrect(q: Question, a: AnswerValue): boolean {
  if (q.type === "multiple_choice" && a.type === "multiple_choice")
    return a.selectedIndex === q.correctIndex;
  if (q.type === "true_false" && a.type === "true_false")
    return a.value === q.correct;
  if (q.type === "image_choice" && a.type === "image_choice")
    return a.selectedIndex === q.correctIndex;
  if (q.type === "drawing" && a.type === "drawing")
    return a.selfGraded === true;
  if (q.type === "short_text" && a.type === "short_text")
    return q.accepted.some(x => x.trim().toLowerCase() === a.text.trim().toLowerCase());
  return false;
}
