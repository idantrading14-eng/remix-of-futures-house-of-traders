export type Student = {
  id: string;
  name: string;
  avatar: string;
  status: "approved" | "pending";
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  waitingForReply: boolean;
};

export type Message = {
  id: string;
  studentId: string;
  content: string;
  sender: "student" | "mentor" | "ai";
  timestamp: string;
  approved?: boolean;
};

export type AISuggestion = {
  id: string;
  studentId: string;
  studentName: string;
  question: string;
  suggestedAnswer: string;
  timestamp: string;
};

export const mockStudents: Student[] = [
  { id: "1", name: "יוסי כהן", avatar: "יכ", status: "approved", lastMessage: "איך אני מתחיל עם React?", lastMessageTime: "10:32", unreadCount: 2, waitingForReply: true },
  { id: "2", name: "שרה לוי", avatar: "של", status: "approved", lastMessage: "תודה רבה על ההסבר!", lastMessageTime: "09:15", unreadCount: 0, waitingForReply: false },
  { id: "3", name: "דוד אברהם", avatar: "דא", status: "approved", lastMessage: "מה ההבדל בין let ל-const?", lastMessageTime: "אתמול", unreadCount: 1, waitingForReply: true },
  { id: "4", name: "מיכל ברק", avatar: "מב", status: "pending", lastMessage: "", lastMessageTime: "", unreadCount: 0, waitingForReply: false },
  { id: "5", name: "אבי גולן", avatar: "אג", status: "pending", lastMessage: "", lastMessageTime: "", unreadCount: 0, waitingForReply: false },
  { id: "6", name: "נועה שלום", avatar: "נש", status: "approved", lastMessage: "הבנתי, אנסה עכשיו", lastMessageTime: "08:45", unreadCount: 0, waitingForReply: false },
];

export const mockMessages: Record<string, Message[]> = {
  "1": [
    { id: "m1", studentId: "1", content: "שלום! אני חדש בקורס", sender: "student", timestamp: "10:00" },
    { id: "m2", studentId: "1", content: "ברוך הבא יוסי! שמח שהצטרפת. איך אפשר לעזור?", sender: "mentor", timestamp: "10:05" },
    { id: "m3", studentId: "1", content: "איך אני מתחיל עם React?", sender: "student", timestamp: "10:32" },
  ],
  "3": [
    { id: "m4", studentId: "3", content: "מה ההבדל בין let ל-const?", sender: "student", timestamp: "אתמול" },
  ],
};

export const mockAISuggestions: AISuggestion[] = [
  {
    id: "ai1",
    studentId: "1",
    studentName: "יוסי כהן",
    question: "איך אני מתחיל עם React?",
    suggestedAnswer: "היי יוסי! כדי להתחיל עם React, אני ממליץ לך:\n\n1. לוודא שיש לך Node.js מותקן\n2. ליצור פרויקט חדש עם Vite: `npm create vite@latest`\n3. לבחור React + TypeScript\n4. להריץ `npm install` ואז `npm run dev`\n\nאחרי זה תוכל להתחיל לבנות קומפוננטות. רוצה שאסביר יותר לעומק?",
    timestamp: "10:33",
  },
  {
    id: "ai2",
    studentId: "3",
    studentName: "דוד אברהם",
    question: "מה ההבדל בין let ל-const?",
    suggestedAnswer: "שאלה מצוינת דוד!\n\n- `const` - משתנה שלא ניתן לשנות את ההצבעה שלו. משתמשים בו כשלא רוצים לשנות את הערך.\n- `let` - משתנה שניתן לשנות. משתמשים כשצריך לעדכן ערכים.\n\nדוגמה:\n```\nconst name = \"דוד\"; // לא ניתן לשנות\nlet age = 25; // ניתן לשנות\nage = 26; // עובד!\n```\n\nהמלצה: תמיד תתחיל עם `const`, ותשנה ל-`let` רק אם צריך.",
    timestamp: "אתמול",
  },
];
