import { useState, useRef, useEffect, useCallback } from "react";
import { Send, ImagePlus, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Msg = { id: string; content: string; sender_role: string; created_at: string; message_type?: string; attachment_url?: string };

const AI_AGENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent`;

type AIChatMsg =
  | { role: "user" | "assistant"; content: string }
  | { role: "user" | "assistant"; content: { type: string; text?: string; image_url?: { url: string } }[] };

function buildAIMessages(messages: Msg[]): AIChatMsg[] {
  return messages.map((m) => {
    const role: "user" | "assistant" = m.sender_role === "student" ? "user" : "assistant";
    if (m.message_type === "image" && m.attachment_url) {
      const parts: { type: string; text?: string; image_url?: { url: string } }[] = [
        { type: "image_url", image_url: { url: m.attachment_url } },
      ];
      if (m.content && m.content !== "📷 תמונה") {
        parts.unshift({ type: "text", text: m.content });
      } else {
        parts.unshift({ type: "text", text: "התלמיד שלח תמונה של גרף. נתח את הגרף." });
      }
      return { role, content: parts };
    }
    return { role, content: m.content };
  });
}

export default function StudentChatView({ userId, displayName }: { userId: string; displayName: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [approved, setApproved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingContent]);

  useEffect(() => {
    const init = async () => {
      const { data: profile } = await supabase.from("profiles").select("approved").eq("id", userId).single();
      setApproved(profile?.approved || false);
      const { data: msgs } = await supabase.from("messages").select("*").eq("student_id", userId).order("created_at", { ascending: true });
      if (msgs) setMessages(msgs as Msg[]);
    };
    init();
  }, [userId]);

  useEffect(() => {
    const channel = supabase
      .channel("student-chat-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `student_id=eq.${userId}` }, (payload) => {
        const newMsg = payload.new as Msg;
        setMessages(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
      })
      .subscribe();

    const profileChannel = supabase
      .channel("student-chat-profile")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` }, (payload) => {
        if ((payload.new as any).approved) {
          setApproved(true);
          toast.success("המנטור אישר אותך! 🎉");
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); supabase.removeChannel(profileChannel); };
  }, [userId]);

  const callAIAgent = useCallback(async (allMessages: Msg[]) => {
    setAiStreaming(true);
    setStreamingContent("");

    const aiMessages = buildAIMessages(allMessages);

    try {
      const resp = await fetch(AI_AGENT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: aiMessages }),
      });

      if (resp.status === 429) { toast.error("יותר מדי בקשות, נסה שוב בעוד דקה."); setAiStreaming(false); return; }
      if (resp.status === 402) { toast.error("נגמרו הקרדיטים."); setAiStreaming(false); return; }
      if (!resp.ok || !resp.body) { toast.error("שגיאה בשירות ה-AI"); setAiStreaming(false); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let result = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              result += content;
              setStreamingContent(result);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) result += content;
          } catch { /* ignore */ }
        }
      }

      if (result.trim()) {
        setStreamingContent("");
        // Save AI response to DB
        await supabase.from("messages").insert({
          student_id: userId,
          content: result.trim(),
          sender_role: "ai",
          sender_id: null,
          message_type: "text",
        } as any);
      }
    } catch (err) {
      console.error("AI agent error:", err);
      toast.error("שגיאה בקבלת תשובה מה-AI");
    } finally {
      setAiStreaming(false);
      setStreamingContent("");
    }
  }, [userId]);

  const handleSend = async () => {
    if (!input.trim() || !approved || aiStreaming) return;
    const content = input.trim();
    setInput("");
    const { data: inserted, error } = await supabase.from("messages").insert({ student_id: userId, content, sender_role: "student", sender_id: userId, message_type: "text" } as any).select().single();
    if (error) { toast.error("שגיאה בשליחת ההודעה"); return; }
    const newMessages = [...messages, inserted as Msg];
    setMessages(newMessages);
    callAIAgent(newMessages);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !approved) return;
    if (!file.type.startsWith("image/")) { toast.error("ניתן להעלות רק תמונות"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("גודל הקובץ מוגבל ל-10MB"); return; }

    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const filePath = `${userId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("chat-attachments").upload(filePath, file);
    if (uploadError) { toast.error("שגיאה בהעלאת התמונה"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(filePath);
    const { data: inserted, error } = await supabase.from("messages").insert({ student_id: userId, content: "📷 תמונה", sender_role: "student", sender_id: userId, message_type: "image", attachment_url: urlData.publicUrl } as any).select().single();
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!error && inserted) {
      const newMessages = [...messages, inserted as Msg];
      setMessages(newMessages);
      callAIAgent(newMessages);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {!approved && (
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: "rgba(255,189,2,0.08)", borderBottom: "1px solid rgba(255,189,2,0.15)" }}>
          <AlertCircle className="h-5 w-5 shrink-0" style={{ color: "#ffbd02" }} />
          <p className="text-sm font-medium" style={{ color: "#ffbd02" }}>החשבון שלך ממתין לאישור המנטור.</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin max-w-2xl mx-auto w-full">
        {messages.length === 0 && approved && (
          <div className="text-center py-12">
            <MessageSquareIcon className="h-12 w-12 mx-auto mb-3" style={{ color: "rgba(255,189,2,0.2)" }} />
            <p style={{ color: "#888" }}>שלח את ההודעה הראשונה שלך למנטור!</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender_role === "student" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
              msg.sender_role === "student" ? "rounded-br-md" : "rounded-bl-md"
            }`} style={{
              background: msg.sender_role === "student" ? "rgba(255,189,2,0.12)" : "rgba(255,255,255,0.08)",
              color: "#e5e5e5",
            }}>
              {msg.message_type === "image" && msg.attachment_url ? (
                <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                  <img src={msg.attachment_url} alt="תמונה" className="rounded-lg max-w-full max-h-64 cursor-pointer hover:opacity-90 transition-opacity" />
                </a>
              ) : msg.message_type === "voice" && msg.attachment_url ? (
                <audio controls className="max-w-full" src={msg.attachment_url} />
              ) : (
                <div className="text-sm leading-relaxed whitespace-pre-wrap prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
              <p className="text-[10px] opacity-50 mt-1">
                {new Date(msg.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}

        {/* Streaming AI response */}
        {aiStreaming && streamingContent && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-bl-md px-4 py-2.5" style={{ background: "rgba(255,255,255,0.08)", color: "#e5e5e5" }}>
              <div className="text-sm leading-relaxed whitespace-pre-wrap prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>{streamingContent}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {aiStreaming && !streamingContent && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.08)", color: "#888" }}>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">חושב...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="p-4 max-w-2xl mx-auto w-full" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex gap-2 items-center">
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={!approved || uploading || aiStreaming} className="px-3 py-2.5 rounded-xl transition-colors disabled:opacity-40" style={{ background: "rgba(255,255,255,0.06)", color: "#888" }} title="העלה תמונה">
            <ImagePlus className="h-4 w-4" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={aiStreaming ? "ממתין לתשובה..." : approved ? "שאל את המנטור שלך..." : "ממתין לאישור..."}
            disabled={!approved || aiStreaming}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.06)", color: "#e5e5e5", border: "1px solid rgba(255,255,255,0.08)" }}
          />
          <button onClick={handleSend} disabled={!input.trim() || !approved || aiStreaming} className="px-4 py-2.5 rounded-xl transition-opacity disabled:opacity-40" style={{ background: "#ffbd02", color: "#1a1a1a" }}>
            <Send className="h-4 w-4" />
          </button>
        </div>
        {uploading && <p className="text-xs mt-2 text-center" style={{ color: "#888" }}>מעלה תמונה...</p>}
      </div>
    </div>
  );
}

function MessageSquareIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
