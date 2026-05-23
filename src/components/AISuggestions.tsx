import { Bot, Check, X, Sparkles, RefreshCw } from "lucide-react";

type AISuggestion = {
  id: string;
  studentId: string;
  studentName: string;
  question: string;
  suggestedAnswer: string;
  timestamp: string;
};

interface AISuggestionsProps {
  suggestions: AISuggestion[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRegenerate: (id: string) => void;
  onSelect: (studentId: string) => void;
  regeneratingIds?: string[];
}

const AISuggestions = ({ suggestions, onApprove, onReject, onRegenerate, onSelect, regeneratingIds = [] }: AISuggestionsProps) => {
  if (suggestions.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-card border-r border-border">
        <div className="text-center p-8 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-chat-ai/50 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Sparkles className="h-8 w-8 text-chat-ai-foreground opacity-70" />
          </div>
          <h3 className="font-bold text-foreground mb-1.5">אין הצעות</h3>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px] mx-auto">כשתלמיד ישאל שאלה, ה-AI יכין תשובה לאישורך</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-card border-r border-border">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center">
            <Bot className="h-4.5 w-4.5 text-secondary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">תשובות AI</h2>
          <span className="mr-auto px-2.5 py-1 rounded-full gradient-accent text-secondary-foreground text-[11px] font-bold shadow-sm">
            {suggestions.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">אשר או דחה תשובות לפני שליחה</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        {suggestions.map((s) => (
          <div key={s.id} className="rounded-2xl border border-border bg-card p-4 shadow-card hover:shadow-premium transition-all duration-300 animate-fade-in">
            {/* Student info */}
            <button
              onClick={() => onSelect(s.studentId)}
              className="flex items-center gap-2.5 mb-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-warning/15 text-warning flex items-center justify-center text-xs font-bold">
                {s.studentName.split(" ").map(w => w[0]).join("")}
              </div>
              <span className="text-sm font-semibold text-foreground">{s.studentName}</span>
              <span className="text-[10px] text-muted-foreground mr-auto">{s.timestamp}</span>
            </button>

            {/* Question */}
            <div className="rounded-xl bg-chat-user/40 p-3 mb-2.5 border border-chat-user/30">
              <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">שאלה</p>
              <p className="text-sm text-foreground leading-relaxed">{s.question}</p>
            </div>

            {/* AI Answer */}
            <div className="rounded-xl bg-chat-ai/40 p-3 mb-3.5 border border-chat-ai/30">
              <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> תשובת AI
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{s.suggestedAnswer}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => onApprove(s.id)}
                className="flex-1 py-2.5 rounded-xl bg-success text-success-foreground text-sm font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 hover:shadow-sm transition-all duration-200"
              >
                <Check className="h-4 w-4" /> אשר ושלח
              </button>
              <button
                onClick={() => onRegenerate(s.id)}
                disabled={regeneratingIds.includes(s.id)}
                className="px-3.5 py-2.5 rounded-xl bg-secondary/10 text-secondary text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-secondary/20 transition-all duration-200 disabled:opacity-50"
                title="צור תשובה חדשה"
              >
                <RefreshCw className={`h-4 w-4 ${regeneratingIds.includes(s.id) ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => onReject(s.id)}
                className="px-3.5 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-destructive/20 transition-all duration-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AISuggestions;
