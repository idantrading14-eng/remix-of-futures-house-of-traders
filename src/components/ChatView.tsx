import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, GraduationCap, Mic, Square, Image, Pencil, Trash2, Check, X, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Student = {
  id: string;
  name: string;
  avatar: string;
  status: "approved" | "pending";
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  waitingForReply: boolean;
};

type Message = {
  id: string;
  studentId: string;
  content: string;
  sender: "student" | "mentor" | "ai";
  timestamp: string;
  messageType?: string;
  attachmentUrl?: string;
};

interface ChatViewProps {
  student: Student | null;
  messages: Message[];
  onSendMessage: (content: string, messageType?: string, attachmentUrl?: string) => void;
  onGenerateAI?: () => void;
  isGeneratingAI?: boolean;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onBack?: () => void;
}

const ChatView = ({ student, messages, onSendMessage, onGenerateAI, isGeneratingAI, onEditMessage, onDeleteMessage, onBack }: ChatViewProps) => {
  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim(), "text");
    setInput("");
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 1000) return; // too short

        const fileName = `voice-${Date.now()}.webm`;
        const { data: user } = await supabase.auth.getUser();
        const filePath = `${user.user?.id}/${fileName}`;

        const { error } = await supabase.storage
          .from("chat-attachments")
          .upload(filePath, blob, { contentType: "audio/webm" });

        if (error) {
          toast.error("שגיאה בהעלאת ההקלטה");
          return;
        }

        const { data: urlData } = supabase.storage
          .from("chat-attachments")
          .getPublicUrl(filePath);

        onSendMessage("🎤 הודעה קולית", "voice", urlData.publicUrl);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      toast.error("אין גישה למיקרופון");
    }
  }, [onSendMessage]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setRecordingTime(0);
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (!student) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background/50">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5 shadow-premium">
            <GraduationCap className="h-10 w-10 text-primary-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">בחר תלמיד</h3>
          <p className="text-sm text-muted-foreground max-w-[240px] mx-auto">בחר תלמיד מהרשימה כדי לראות את השיחה</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-card h-full min-h-0 relative overflow-hidden">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-border flex items-center gap-2 sm:gap-3 bg-card shadow-sm">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-all duration-200 shrink-0">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center font-bold text-sm shrink-0">
          {student.avatar}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-foreground text-sm sm:text-base truncate">{student.name}</h3>
          <p className="text-[11px] text-muted-foreground">
            {student.waitingForReply ? "ממתין לתשובה" : "פעיל"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {student.waitingForReply && (
            <span className="px-2.5 py-1 rounded-full bg-warning/15 text-warning text-[10px] sm:text-xs font-semibold animate-pulse-soft border border-warning/20">
              ממתין
            </span>
          )}
          {onGenerateAI && (
            <button
              onClick={onGenerateAI}
              disabled={isGeneratingAI}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-secondary/10 text-secondary text-[10px] sm:text-xs font-semibold hover:bg-secondary/20 transition-all duration-200 disabled:opacity-50 border border-secondary/15"
            >
              <Bot className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isGeneratingAI ? "מייצר..." : "צור תשובת AI"}</span>
              <span className="sm:hidden">{isGeneratingAI ? "..." : "AI"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 scrollbar-thin bg-background/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex animate-fade-in group ${msg.sender === "student" ? "justify-start" : "justify-end"}`}
          >
            <div className={`relative max-w-[75%] rounded-2xl px-4 py-3 shadow-sm transition-all duration-200 hover:shadow-card ${
              msg.sender === "student"
                ? "bg-chat-user text-chat-user-foreground rounded-br-md border border-chat-user/50"
                : msg.sender === "ai"
                ? "bg-chat-ai text-chat-ai-foreground rounded-bl-md border border-chat-ai/50"
                : "bg-chat-mentor text-chat-mentor-foreground rounded-bl-md border border-chat-mentor/50"
            }`}>
              <div className="flex items-center gap-1.5 mb-1">
                {msg.sender === "student" && <User className="h-3 w-3" />}
                {msg.sender === "ai" && <Bot className="h-3 w-3" />}
                {msg.sender === "mentor" && <GraduationCap className="h-3 w-3" />}
                <span className="text-[10px] font-medium opacity-70">
                  {msg.sender === "student" ? "תלמיד" : msg.sender === "ai" ? "AI" : "מנטור"}
                </span>
                <span className="text-[10px] opacity-50 mr-1">{msg.timestamp}</span>
                {msg.sender === "mentor" && (onEditMessage || onDeleteMessage) && editingId !== msg.id && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mr-auto">
                    {onEditMessage && msg.messageType !== "voice" && msg.messageType !== "image" && (
                      <button
                        onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }}
                        className="p-0.5 rounded hover:bg-foreground/10 transition-colors"
                        title="ערוך"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                    {onDeleteMessage && (
                      <button
                        onClick={() => setDeletingId(msg.id)}
                        className="p-0.5 rounded hover:bg-destructive/20 text-destructive transition-colors"
                        title="מחק"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              {editingId === msg.id ? (
                <div className="flex items-center gap-2">
                  <input
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { onEditMessage?.(msg.id, editContent); setEditingId(null); }
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 text-sm bg-background/50 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-secondary"
                    autoFocus
                  />
                  <button onClick={() => { onEditMessage?.(msg.id, editContent); setEditingId(null); }} className="p-1 rounded hover:bg-foreground/10"><Check className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-foreground/10"><X className="h-3.5 w-3.5" /></button>
                </div>
              ) : msg.messageType === "image" && msg.attachmentUrl ? (
                <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer">
                  <img src={msg.attachmentUrl} alt="תמונה" className="rounded-lg max-w-full max-h-64 cursor-pointer hover:opacity-90 transition-opacity" />
                </a>
              ) : msg.messageType === "voice" && msg.attachmentUrl ? (
                <audio controls className="max-w-full mt-1" src={msg.attachmentUrl} />
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Delete confirmation dialog */}
      {deletingId && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg max-w-sm mx-4 text-center">
            <Trash2 className="h-8 w-8 text-destructive mx-auto mb-3" />
            <h4 className="font-bold text-foreground mb-1">למחוק את ההודעה?</h4>
            <p className="text-sm text-muted-foreground mb-4">פעולה זו לא ניתנת לביטול</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={() => { onDeleteMessage?.(deletingId); setDeletingId(null); }}
                className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                מחק
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border bg-card shadow-[0_-2px_12px_hsl(220_30%_12%_/_0.04)]">
        <div className="flex gap-2.5 items-center">
          {isRecording ? (
            <>
              <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20">
                <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                <span className="text-sm text-destructive font-semibold">מקליט... {formatTime(recordingTime)}</span>
              </div>
              <button
                onClick={stopRecording}
                className="px-4 py-3 rounded-xl bg-destructive text-destructive-foreground hover:opacity-90 transition-all duration-200 shadow-sm"
              >
                <Square className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="כתוב תשובה..."
                className="flex-1 px-4 py-3 rounded-xl bg-muted/60 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 border border-transparent focus:border-secondary/20 transition-all duration-200"
              />
              <button
                onClick={startRecording}
                className="px-3.5 py-3 rounded-xl bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 border border-transparent hover:border-border"
                title="הקלט הודעה קולית"
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="px-4 py-3 rounded-xl gradient-accent text-secondary-foreground hover:shadow-glow transition-all duration-200 disabled:opacity-40 disabled:hover:shadow-none"
              >
                <Send className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatView;
