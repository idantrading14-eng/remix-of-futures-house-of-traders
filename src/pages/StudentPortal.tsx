import { useState, useRef, useEffect } from "react";
import { Send, GraduationCap, LogOut, AlertCircle, ImagePlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { logout } from "@/lib/auth";
import { toast } from "sonner";
import OnboardingPopup from "@/components/student/OnboardingPopup";

type Msg = { id: string; content: string; sender_role: string; created_at: string; message_type?: string; attachment_url?: string };

const StudentPortal = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [hasChatAccess, setHasChatAccess] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }
      setUserId(user.id);

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!profile || profile.role !== "student") { navigate("/"); return; }

      setDisplayName(profile.display_name);
      setApproved(profile.approved || false);
      setUserEmail(user.email || "");

      if (!(profile as any).onboarding_completed) {
        setShowOnboarding(true);
      }

      const { data: acc } = await supabase.from("student_access").select("has_mentorchat_access").eq("user_id", user.id).single();
      setHasChatAccess(acc?.has_mentorchat_access || false);

      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: true });
      if (msgs) setMessages(msgs as Msg[]);
      setLoading(false);
    };
    init();
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("student-messages")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `student_id=eq.${userId}`,
      }, (payload) => {
        const newMsg = payload.new as Msg;
        setMessages((prev) => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();

    const profileChannel = supabase
      .channel("student-profile")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "profiles",
        filter: `id=eq.${userId}`,
      }, (payload) => {
        const updated = payload.new as any;
        if (updated.approved) {
          setApproved(true);
          toast.success("המנטור אישר אותך! אפשר להתחיל לשאול שאלות 🎉");
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(profileChannel);
    };
  }, [userId]);

  const handleSend = async () => {
    if (!input.trim() || !userId || !approved) return;
    const content = input.trim();
    setInput("");

    const { error } = await supabase.from("messages").insert({
      student_id: userId,
      content,
      sender_role: "student",
      sender_id: userId,
      message_type: "text",
    } as any);

    if (error) toast.error("שגיאה בשליחת ההודעה");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId || !approved) return;

    if (!file.type.startsWith("image/")) {
      toast.error("ניתן להעלות רק תמונות");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("גודל הקובץ מוגבל ל-10MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const fileName = `${Date.now()}.${ext}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("chat-attachments")
      .upload(filePath, file);

    if (uploadError) {
      toast.error("שגיאה בהעלאת התמונה");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("chat-attachments")
      .getPublicUrl(filePath);

    const { error } = await supabase.from("messages").insert({
      student_id: userId,
      content: "📷 תמונה",
      sender_role: "student",
      sender_id: userId,
      message_type: "image",
      attachment_url: urlData.publicUrl,
    } as any);

    if (error) toast.error("שגיאה בשליחת התמונה");
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft text-muted-foreground">טוען...</div>
      </div>
    );
  }

  if (!hasChatAccess) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background" dir="rtl">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold text-foreground">אין גישה לצ'אט</h2>
          <p className="text-muted-foreground">אין לך הרשאה לגשת לצ'אט המנטור. פנה למנטור שלך לקבלת גישה.</p>
          <button onClick={handleLogout} className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">התנתק</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {showOnboarding && userId && (
        <OnboardingPopup
          userId={userId}
          displayName={displayName}
          email={userEmail}
          onComplete={() => setShowOnboarding(false)}
        />
      )}
      <div className="h-14 gradient-accent flex items-center px-4 gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-secondary-foreground/10 flex items-center justify-center">
          <GraduationCap className="h-5 w-5 text-secondary-foreground" />
        </div>
        <h1 className="font-bold text-secondary-foreground text-lg">MentorChat</h1>
        <span className="text-secondary-foreground/60 text-sm">שלום, {displayName}</span>
        <button
          onClick={handleLogout}
          className="mr-auto flex items-center gap-1.5 text-secondary-foreground/60 hover:text-secondary-foreground text-sm transition-colors"
        >
          <LogOut className="h-4 w-4" />
          יציאה
        </button>
      </div>

      {!approved && (
        <div className="bg-warning/10 border-b border-warning/20 px-4 py-3 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-warning shrink-0" />
          <p className="text-sm text-warning font-medium">החשבון שלך ממתין לאישור המנטור. ברגע שתאושר, תוכל לשלוח הודעות.</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin max-w-2xl mx-auto w-full">
        {messages.length === 0 && approved && (
          <div className="text-center py-12 animate-fade-in">
            <GraduationCap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">שלח את ההודעה הראשונה שלך למנטור!</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex animate-fade-in ${msg.sender_role === "student" ? "justify-start" : "justify-end"}`}
          >
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
              msg.sender_role === "student"
                ? "bg-chat-user text-chat-user-foreground rounded-br-md"
                : "bg-chat-mentor text-chat-mentor-foreground rounded-bl-md"
            }`}>
              {msg.message_type === "image" && msg.attachment_url ? (
                <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                  <img src={msg.attachment_url} alt="תמונה" className="rounded-lg max-w-full max-h-64 cursor-pointer hover:opacity-90 transition-opacity" />
                </a>
              ) : msg.message_type === "voice" && msg.attachment_url ? (
                <audio controls className="max-w-full" src={msg.attachment_url} />
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              )}
              <p className="text-[10px] opacity-50 mt-1">
                {new Date(msg.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-4 max-w-2xl mx-auto w-full">
        <div className="flex gap-2 items-center">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!approved || uploading}
            className="px-3 py-2.5 rounded-xl bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors disabled:opacity-40"
            title="העלה תמונה"
          >
            <ImagePlus className="h-4 w-4" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={approved ? "שאל את המנטור שלך..." : "ממתין לאישור..."}
            disabled={!approved}
            className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-secondary disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !approved}
            className="px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        {uploading && <p className="text-xs text-muted-foreground mt-2 text-center">מעלה תמונה...</p>}
      </div>
    </div>
  );
};

export default StudentPortal;
