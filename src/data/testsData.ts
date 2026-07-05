import type { Level } from "@/components/student/tests/types";

export const testLevels: Level[] = [
  {
    id: "level-1",
    title: "רמה 1 — יסודות",
    questions: [
      {
        id: "l1-q1",
        type: "multiple_choice",
        prompt: "מהו נר יפני ירוק (בולי)?",
        options: [
          "נר שבו מחיר הסגירה נמוך ממחיר הפתיחה",
          "נר שבו מחיר הסגירה גבוה ממחיר הפתיחה",
          "נר ללא גוף",
          "נר עם פתילים בלבד",
        ],
        correctIndex: 1,
        explanation: "נר ירוק (בולי) מציין שהסגירה מעל הפתיחה — לחץ קונים.",
      },
      {
        id: "l1-q2",
        type: "true_false",
        prompt: "חוזה עתידי מחייב את הצדדים לבצע עסקה במחיר קבוע במועד עתידי.",
        correct: true,
        explanation: "זו בדיוק ההגדרה של חוזה עתידי (Futures).",
      },
      {
        id: "l1-q3",
        type: "short_text",
        prompt: "כתוב את הקיצור של Fair Value Gap (באנגלית).",
        accepted: ["FVG", "fvg"],
        explanation: "FVG = Fair Value Gap, אזור של חוסר איזון במחיר.",
      },
      {
        id: "l1-q4",
        type: "image_choice",
        prompt: "בחר את הדוגמה שמייצגת מגמת עלייה (Uptrend).",
        options: [
          { label: "שיאים ושפלים עולים", image: "https://placehold.co/400x240/1a1a1a/22c55e?text=Uptrend" },
          { label: "שיאים ושפלים יורדים", image: "https://placehold.co/400x240/1a1a1a/ef4444?text=Downtrend" },
          { label: "טווח אופקי", image: "https://placehold.co/400x240/1a1a1a/888?text=Range" },
        ],
        correctIndex: 0,
        explanation: "מגמת עלייה מוגדרת ע\"י רצף של שיאים ושפלים גבוהים יותר.",
      },
      {
        id: "l1-q5",
        type: "drawing",
        prompt: "צייר נר יפני ירוק פשוט (גוף + פתילים).",
        correctAnswerImage: "https://placehold.co/400x400/1a1a1a/22c55e?text=Green+Candle",
        explanation: "נר ירוק: גוף מלא, פתיל עליון קצר ופתיל תחתון קצר.",
      },
    ],
  },
  {
    id: "level-2",
    title: "רמה 2 — ניתוח טכני",
    questions: [
      {
        id: "l2-q1",
        type: "multiple_choice",
        prompt: "מה מייצג Fair Value Gap (FVG)?",
        options: [
          "רמת התנגדות חזקה",
          "אזור של חוסר איזון בין קונים למוכרים",
          "ממוצע נע של 200 ימים",
          "נר דוג'י",
        ],
        correctIndex: 1,
        explanation: "FVG הוא אזור שנוצר כאשר יש תנועה חדה שמותירה חוסר איזון.",
      },
      {
        id: "l2-q2",
        type: "true_false",
        prompt: "אסטרטגיית IFVG מבוססת על היפוך של Fair Value Gap.",
        correct: true,
        explanation: "IFVG = Inverse FVG — כאשר FVG נפרץ ומשמש כתמיכה/התנגדות הפוכה.",
      },
      {
        id: "l2-q3",
        type: "short_text",
        prompt: "כמה סוגי פקודות עיקריים למדנו? (מספר)",
        accepted: ["3", "שלוש", "שלושה"],
        explanation: "MARKET, LIMIT ו-STOP.",
      },
      {
        id: "l2-q4",
        type: "drawing",
        prompt: "צייר סכימה של FVG בין שלושה נרות.",
        correctAnswerImage: "https://placehold.co/500x300/1a1a1a/d4a017?text=FVG+Diagram",
        explanation: "FVG נוצר כשגוף הנר האמצעי משאיר רווח בין הפתיל העליון של הנר הקודם לפתיל התחתון של הנר הבא.",
      },
    ],
  },
];
