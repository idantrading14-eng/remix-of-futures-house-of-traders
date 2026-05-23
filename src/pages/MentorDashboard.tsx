import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDivision } from "@/contexts/DivisionContext";
import { getAISuggestion, type ChatMessage } from "@/lib/aiAgent";
import { logout } from "@/lib/auth";
import ClientList from "@/components/ClientList";
import ChatView from "@/components/ChatView";
import AISuggestions from "@/components/AISuggestions";
import ClientFile from "@/components/ClientFile";
import StatsCards from "@/components/clients/StatsCards";
import { LogOut, GraduationCap, Users, Bot, MessageSquare, FileText, GitBranch, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

type Profile = {
  id: string;
  display_name: string;
  role: string;
  approved: boolean;
};

type Message = {
  id: string;
  student_id: string;
  content: string;
  sender_role: string;
  sender_id: string | null;
  created_at: string;
};

type AISuggestionRow = {
  id: string;
  student_id: string;
  student_name: string;
  question: string;
  suggested_answer: string;
  status: string;
  created_at: string;
};

type StudentItem = {
  id: string;
  name: string;
  avatar: string;
  status: "approved" | "pending";
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  waitingForReply: boolean;
};

type Filter = "all" | "waiting" | "pending";
type MobilePanel = "clients" | "chat" | "ai" | "files";
type ViewMode = "chat" | "files";

interface MentorDashboardProps {
  embedded?: boolean;
  onViewChange?: (view: string) => void;
  showStats?: boolean;
}

const MentorDashboard = ({ embedded = false, onViewChange, showStats = true }: MentorDashboardProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { activeDivisionId } = useDivision();
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<AISuggestionRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [mentorId, setMentorId] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [regeneratingIds, setRegeneratingIds] = useState<string[]>([]);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("clients");
  const [viewMode, setViewMode] = useState<ViewMode>("chat");

  // Stats state
  const [statsData, setStatsData] = useState({ total: 0, active: 0, thisMonth: 0, avgStage: 0, revenue: 0 });

  // Load data
  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { if (!embedded) navigate("/"); return; }
    setMentorId(user.id);

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "mentor") { if (!embedded) navigate("/"); return; }

    let profilesQuery = supabase.from("profiles").select("*").in("role", ["student", "manual_client"]);
    if (activeDivisionId) profilesQuery = profilesQuery.eq("division_id", activeDivisionId);
    const { data: profiles } = await profilesQuery;
    const { data: msgs } = await supabase.from("messages").select("*").order("created_at", { ascending: true });
    const { data: aiSugs } = await supabase.from("ai_suggestions").select("*").eq("status", "pending").order("created_at", { ascending: false });

    if (msgs) setMessages(msgs);
    if (aiSugs) setSuggestions(aiSugs);

    if (profiles) {
      // Compute stats from all clients (students + manual_clients)
      const allClientIds = profiles.map(p => p.id);
      const { data: details } = await supabase.from("client_details").select("*").in("student_id", allClientIds);
      const { data: stages } = await supabase.from("student_stages").select("*").in("student_id", allClientIds);
      const { data: payments } = await supabase.from("payments").select("*");

      const detailsMap = new Map((details || []).map((d: any) => [d.student_id, d]));
      const stagesMap = new Map((stages || []).map((s: any) => [s.student_id, s]));

      const total = profiles.length;
      const active = profiles.filter(p => {
        const d = detailsMap.get(p.id) as any;
        return !d || d.status === "active";
      }).length;
      const now = new Date();
      const thisMonth = profiles.filter(p => {
        if (!p.created_at) return false;
        const d = new Date(p.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;
      const totalStage = profiles.reduce((sum, p) => {
        const s = stagesMap.get(p.id) as any;
        return sum + (s?.stage || 0);
      }, 0);
      const avgStage = total > 0 ? totalStage / total : 0;

      // Monthly revenue from payments this month
      const monthlyRevenue = (payments || [])
        .filter((pay: any) => {
          const d = new Date(pay.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && pay.status === "paid";
        })
        .reduce((sum: number, pay: any) => sum + Number(pay.amount), 0);

      setStatsData({ total, active, thisMonth, avgStage, revenue: monthlyRevenue });

      const regularStudents = profiles.filter((p: Profile) => p.role === "student");

      // Fetch chat access to filter out students without mentorchat access
      const { data: accessRecords } = await supabase
        .from("student_access")
        .select("user_id, has_mentorchat_access")
        .in("user_id", regularStudents.map(p => p.id));
      const chatAccessSet = new Set(
        (accessRecords || []).filter(a => a.has_mentorchat_access).map(a => a.user_id)
      );

      const studentsWithChatAccess = regularStudents.filter(p => chatAccessSet.has(p.id));

      const studentItems: StudentItem[] = studentsWithChatAccess.map((p: Profile) => {
        const studentMsgs = (msgs || []).filter((m: Message) => m.student_id === p.id);
        const lastMsg = studentMsgs[studentMsgs.length - 1];
        const lastStudentMsg = [...studentMsgs].reverse().find((m: Message) => m.sender_role === "student");
        const lastMentorMsg = [...studentMsgs].reverse().find((m: Message) => m.sender_role === "mentor");
        const waitingForReply = lastStudentMsg && (!lastMentorMsg || new Date(lastStudentMsg.created_at) > new Date(lastMentorMsg.created_at));

        return {
          id: p.id,
          name: p.display_name,
          avatar: p.display_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2),
          status: p.approved ? "approved" as const : "pending" as const,
          lastMessage: lastMsg?.content || "",
          lastMessageTime: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : "",
          unreadCount: waitingForReply ? 1 : 0,
          waitingForReply: !!waitingForReply,
        };
      });
      setStudents(studentItems);
    }
  }, [navigate, embedded, activeDivisionId]);

  useEffect(() => {
    loadData().then(() => generateMissingSuggestions());
  }, [loadData]);

  // Realtime: listen for new/updated/deleted messages
  useEffect(() => {
    const channel = supabase
      .channel("mentor-messages-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newMsg = payload.new as Message;
            setMessages((prev) => {
              if (prev.find((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            // Update student list: last message & waiting status
            setStudents((prev) =>
              prev.map((s) => {
                if (s.id !== newMsg.student_id) return s;
                return {
                  ...s,
                  lastMessage: newMsg.content,
                  lastMessageTime: new Date(newMsg.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }),
                  unreadCount: newMsg.sender_role === "student" ? s.unreadCount + 1 : s.unreadCount,
                  waitingForReply: newMsg.sender_role === "student",
                };
              })
            );
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Message;
            setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string };
            setMessages((prev) => prev.filter((m) => m.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const generateMissingSuggestions = async () => {
    const { data: msgs } = await supabase.from("messages").select("*").eq("sender_role", "student").order("created_at", { ascending: false });
    if (!msgs || msgs.length === 0) return;

    const { data: existingSugs } = await supabase.from("ai_suggestions").select("question, student_id");
    const existingKeys = new Set((existingSugs || []).map((s: any) => `${s.student_id}::${s.question}`));

    for (const msg of msgs) {
      const key = `${msg.student_id}::${msg.content}`;
      if (existingKeys.has(key)) continue;

      const { data: laterMsgs } = await supabase.from("messages").select("id").eq("student_id", msg.student_id).eq("sender_role", "mentor").gt("created_at", msg.created_at).limit(1);
      if (laterMsgs && laterMsgs.length > 0) continue;

      const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", msg.student_id).single();
      const studentName = profile?.display_name || "תלמיד";

      const { data: studentMsgs } = await supabase.from("messages").select("*").eq("student_id", msg.student_id).order("created_at", { ascending: true });
      const chatHistory: ChatMessage[] = (studentMsgs || []).map((m: any) => ({
        content: m.content,
        sender_role: m.sender_role,
        message_type: m.message_type || "text",
        attachment_url: m.attachment_url || undefined,
      }));

      try {
        const aiAnswer = await getAISuggestion(chatHistory);
        const { data: inserted } = await supabase.from("ai_suggestions").insert({
          student_id: msg.student_id,
          student_name: studentName,
          question: msg.content,
          suggested_answer: aiAnswer,
          status: "pending",
        }).select().single();

        if (inserted) {
          setSuggestions((prev) => [inserted, ...prev]);
          toast.success(`תשובת AI מוכנה עבור ${studentName}`);
        }
      } catch {
        toast.error("שגיאה ביצירת תשובת AI");
      }
    }
  };

  // Realtime subscriptions
  useEffect(() => {
    const msgChannel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);

        if (newMsg.sender_role === "student") {
          const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", newMsg.student_id).single();
          const studentName = profile?.display_name || "תלמיד";

          const { data: studentMsgs } = await supabase.from("messages").select("*").eq("student_id", newMsg.student_id).order("created_at", { ascending: true });
          const chatHistory: ChatMessage[] = (studentMsgs || []).map((m: any) => ({
            content: m.content,
            sender_role: m.sender_role,
            message_type: m.message_type || "text",
            attachment_url: m.attachment_url || undefined,
          }));

          try {
            const aiAnswer = await getAISuggestion(chatHistory);
            const { data: inserted } = await supabase.from("ai_suggestions").insert({
              student_id: newMsg.student_id,
              student_name: studentName,
              question: newMsg.content,
              suggested_answer: aiAnswer,
              status: "pending",
            }).select().single();

            if (inserted) {
              setSuggestions((prev) => [inserted, ...prev]);
              toast.success(`תשובת AI מוכנה עבור ${studentName}`);
            }
          } catch {
            toast.error("שגיאה ביצירת תשובת AI");
          }

          loadData();
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (payload) => {
        setMessages((prev) => prev.filter(m => m.id !== (payload.old as any).id));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
        const updated = payload.new as Message;
        setMessages((prev) => prev.map(m => m.id === updated.id ? updated : m));
      })
      .subscribe();

    const sugChannel = supabase
      .channel("suggestions-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_suggestions" }, () => {})
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(sugChannel);
    };
  }, [loadData]);

  const selectedStudent = students.find((s) => s.id === selectedId) || null;
  const selectedMessages = messages.filter((m) => m.student_id === selectedId);

  const chatMessages = selectedMessages.map((m) => ({
    id: m.id,
    studentId: m.student_id,
    content: m.content,
    sender: m.sender_role as "student" | "mentor" | "ai",
    timestamp: new Date(m.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }),
    messageType: (m as any).message_type || "text",
    attachmentUrl: (m as any).attachment_url || undefined,
  }));

  const handleSendMessage = async (content: string, messageType?: string, attachmentUrl?: string) => {
    if (!selectedId || !mentorId) return;
    const { data: inserted } = await supabase.from("messages").insert({
      student_id: selectedId,
      content,
      sender_role: "mentor",
      sender_id: mentorId,
      message_type: messageType || "text",
      attachment_url: attachmentUrl || null,
    } as any).select().single();
    if (inserted) {
      setMessages((prev) => prev.find(m => m.id === inserted.id) ? prev : [...prev, inserted]);
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!newContent.trim()) return;
    await supabase.from("messages").update({ content: newContent.trim() }).eq("id", messageId);
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, content: newContent.trim() } : m));
    toast.success("ההודעה עודכנה");
  };

  const handleDeleteMessage = async (messageId: string) => {
    await supabase.from("messages").delete().eq("id", messageId);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    toast.success("ההודעה נמחקה");
  };

  const handleApproveSuggestion = async (suggestionId: string) => {
    const suggestion = suggestions.find((s) => s.id === suggestionId);
    if (!suggestion || !mentorId) return;

    await supabase.from("messages").insert({
      student_id: suggestion.student_id,
      content: suggestion.suggested_answer,
      sender_role: "mentor",
      sender_id: mentorId,
    });

    await supabase.from("ai_suggestions").update({ status: "approved" }).eq("id", suggestionId);
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
    toast.success("התשובה נשלחה לתלמיד");
    loadData();
  };

  const handleRejectSuggestion = async (id: string) => {
    await supabase.from("ai_suggestions").update({ status: "rejected" }).eq("id", id);
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
    toast.info("התשובה נדחתה");
  };

  const handleRegenerateSuggestion = async (id: string) => {
    const suggestion = suggestions.find((s) => s.id === id);
    if (!suggestion) return;

    setRegeneratingIds((prev) => [...prev, id]);
    try {
      const { data: studentMsgs } = await supabase.from("messages").select("*").eq("student_id", suggestion.student_id).order("created_at", { ascending: true });
      const chatHistory: ChatMessage[] = (studentMsgs || []).map((m: any) => ({
        content: m.content, sender_role: m.sender_role, message_type: m.message_type || "text", attachment_url: m.attachment_url || undefined,
      }));
      const aiAnswer = await getAISuggestion(chatHistory);
      await supabase.from("ai_suggestions").update({ suggested_answer: aiAnswer }).eq("id", id);
      setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, suggested_answer: aiAnswer } : s));
      toast.success("תשובה חדשה נוצרה");
    } catch {
      toast.error("שגיאה ביצירת תשובה חדשה");
    } finally {
      setRegeneratingIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleManualGenerateAI = async () => {
    if (!selectedId) return;
    setIsGeneratingAI(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", selectedId).single();
      const studentName = profile?.display_name || "תלמיד";
      const { data: studentMsgs } = await supabase.from("messages").select("*").eq("student_id", selectedId).order("created_at", { ascending: true });
      const chatHistory: ChatMessage[] = (studentMsgs || []).map((m: any) => ({
        content: m.content, sender_role: m.sender_role, message_type: m.message_type || "text", attachment_url: m.attachment_url || undefined,
      }));
      const lastStudentMsg = [...(studentMsgs || [])].reverse().find((m: any) => m.sender_role === "student");
      const aiAnswer = await getAISuggestion(chatHistory);
      const { data: inserted } = await supabase.from("ai_suggestions").insert({
        student_id: selectedId, student_name: studentName, question: lastStudentMsg?.content || "שאלה כללית", suggested_answer: aiAnswer, status: "pending",
      }).select().single();
      if (inserted) {
        setSuggestions((prev) => [inserted, ...prev]);
        toast.success("תשובת AI מוכנה");
      }
    } catch {
      toast.error("שגיאה ביצירת תשובת AI");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleApproveStudent = async (id: string) => {
    await supabase.from("profiles").update({ approved: true }).eq("id", id);
    toast.success("התלמיד אושר");
    loadData();
  };

  const handleDeleteClient = async (id: string, name: string) => {
    try {
      await supabase.from("ai_suggestions").delete().eq("student_id", id);
      await supabase.from("messages").delete().eq("student_id", id);
      await supabase.from("client_notes").delete().eq("student_id", id);
      await supabase.from("client_details").delete().eq("student_id", id);
      await supabase.from("student_stages").delete().eq("student_id", id);
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;
      toast.success(`${name} נמחק בהצלחה`);
      if (selectedId === id) setSelectedId(null);
      loadData();
    } catch {
      toast.error("שגיאה במחיקת לקוח");
    }
  };

  const handleLogout = async () => {
    if (embedded && onViewChange) {
      onViewChange("logout");
    } else {
      await logout();
      navigate("/");
    }
  };

  const handleSelectStudent = (id: string) => {
    setSelectedId(id);
    if (isMobile) setMobilePanel("chat");
  };

  const handleSelectFromSuggestion = (studentId: string) => {
    setSelectedId(studentId);
    setFilter("all");
    if (isMobile) setMobilePanel("chat");
  };

  const handleGoToTimeline = () => {
    if (embedded && onViewChange) {
      onViewChange("timeline");
    } else {
      navigate("/timeline");
    }
  };

  const handleGoToAddClient = () => {
    if (embedded && onViewChange) {
      onViewChange("timeline");
    } else {
      navigate("/timeline?add=1");
    }
  };

  const mappedSuggestions = suggestions.map((s) => ({
    id: s.id,
    studentId: s.student_id,
    studentName: s.student_name,
    question: s.question,
    suggestedAnswer: s.suggested_answer,
    timestamp: new Date(s.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }),
  }));

  return (
    <div className={`${embedded ? "h-full" : "h-screen"} flex flex-col`}>
      {/* Header — only when standalone */}
      {!embedded && (
        <div className="h-14 gradient-primary flex items-center px-5 gap-3 shrink-0 shadow-md relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-hsl(175 55% 40% / 0.08) pointer-events-none" />
          <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
            <GraduationCap className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <h1 className="font-bold text-primary-foreground text-lg leading-tight">MentorChat</h1>
            <span className="text-primary-foreground/40 text-[10px] hidden sm:block">פאנל מנטור</span>
          </div>
          {!isMobile && (
            <>
              {viewMode !== "chat" && (
                <button
                  onClick={() => setViewMode("chat")}
                  className="flex items-center gap-2 text-sm transition-all duration-200 px-3.5 py-1.5 rounded-xl border bg-white/5 text-primary-foreground/60 border-white/10 hover:bg-white/10 hover:text-primary-foreground"
                >
                  <Users className="h-4 w-4" />
                  <span>חזרה ללקוחות</span>
                </button>
              )}
              <button
                onClick={() => setViewMode(viewMode === "files" ? "chat" : "files")}
                className={`flex items-center gap-2 text-sm transition-all duration-200 px-3.5 py-1.5 rounded-xl border ${viewMode === "files" ? "bg-secondary/20 text-secondary border-secondary/30 shadow-glow" : "bg-white/5 text-primary-foreground/60 border-white/10 hover:bg-white/10 hover:text-primary-foreground"}`}
              >
                <FileText className="h-4 w-4" />
                <span>תיקי לקוחות</span>
              </button>
              <button
                onClick={handleGoToTimeline}
                className="flex items-center gap-2 text-sm transition-all duration-200 px-3.5 py-1.5 rounded-xl border bg-white/5 text-primary-foreground/60 border-white/10 hover:bg-white/10 hover:text-primary-foreground"
              >
                <GitBranch className="h-4 w-4" />
                <span>מסלול התקדמות</span>
              </button>
              <button
                onClick={handleGoToAddClient}
                className="flex items-center gap-2 text-sm transition-all duration-200 px-3.5 py-1.5 rounded-xl border bg-secondary/20 text-secondary border-secondary/30 hover:bg-secondary/30 shadow-glow"
              >
                <UserPlus className="h-4 w-4" />
                <span>הוסף לקוח</span>
              </button>
            </>
          )}
          <button
            onClick={handleLogout}
            className="mr-auto flex items-center gap-1.5 text-primary-foreground/50 hover:text-primary-foreground text-sm transition-all duration-200 px-3 py-1.5 rounded-xl hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">יציאה</span>
          </button>
        </div>
      )}

      {/* Embedded toolbar with stats */}
      {embedded && !isMobile && (
        <div className={`shrink-0 ${showStats ? 'border-b border-white/[0.06]' : ''}`}>
          {/* Stats row */}
          {showStats && (
            <div className="px-4 pt-4 pb-2">
              <StatsCards
                totalClients={statsData.total}
                activeClients={statsData.active}
                newClientsThisMonth={statsData.thisMonth}
                averageStage={statsData.avgStage}
                monthlyRevenue={statsData.revenue}
              />
            </div>
          )}
          {/* Toolbar */}
          <div className="h-12 flex items-center gap-2 px-4">
            <button
              onClick={() => setViewMode(viewMode === "files" ? "chat" : "files")}
              className={`flex items-center gap-2 text-xs transition-all duration-200 px-3 py-1.5 rounded-lg border ${
                viewMode === "files"
                  ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                  : "bg-white/[0.04] text-gray-400 border-white/[0.06] hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>תיקי לקוחות</span>
            </button>
            <button
              onClick={handleGoToAddClient}
              className="flex items-center gap-2 text-xs transition-all duration-200 px-3 py-1.5 rounded-lg border bg-indigo-500/15 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/25"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>הוסף לקוח</span>
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 flex overflow-hidden ${embedded ? "bg-[#0A0A0F]" : "bg-background"}`}>
        {/* Client list */}
        <div className={`shrink-0 border-l ${embedded ? "border-white/[0.06]" : "border-border"} ${isMobile ? (mobilePanel === "clients" ? "flex w-full" : "hidden") : "flex w-72"}`}>
          <ClientList
            students={students}
            selectedId={selectedId}
            onSelect={handleSelectStudent}
            filter={filter}
            onFilterChange={setFilter}
            onApprove={handleApproveStudent}
            onDelete={handleDeleteClient}
          />
        </div>
        {/* Desktop: show files or chat panel */}
        {!isMobile && viewMode === "files" ? (
          <div className={`flex flex-1 border-l ${embedded ? "border-white/[0.06]" : "border-border"}`}>
            <ClientFile
              students={students.map(s => ({ id: s.id, name: s.name, avatar: s.avatar, status: s.status }))}
            />
          </div>
        ) : (
          <div className={`min-h-0 flex-col ${isMobile ? (mobilePanel === "chat" ? "flex flex-1" : "hidden") : `flex flex-1 border-l ${embedded ? "border-white/[0.06]" : "border-border"}`}`}>
            <ChatView
              student={selectedStudent ? {
                id: selectedStudent.id,
                name: selectedStudent.name,
                avatar: selectedStudent.avatar,
                status: selectedStudent.status,
                lastMessage: selectedStudent.lastMessage,
                lastMessageTime: selectedStudent.lastMessageTime,
                unreadCount: selectedStudent.unreadCount,
                waitingForReply: selectedStudent.waitingForReply,
              } : null}
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              onGenerateAI={selectedId ? handleManualGenerateAI : undefined}
              isGeneratingAI={isGeneratingAI}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onBack={isMobile ? () => setMobilePanel("clients") : undefined}
            />
          </div>
        )}
        <div className={`shrink-0 ${isMobile ? (mobilePanel === "ai" ? "flex w-full" : "hidden") : "flex w-80"}`}>
          <AISuggestions
            suggestions={mappedSuggestions}
            onApprove={handleApproveSuggestion}
            onReject={handleRejectSuggestion}
            onRegenerate={handleRegenerateSuggestion}
            onSelect={handleSelectFromSuggestion}
            regeneratingIds={regeneratingIds}
          />
        </div>
        {/* Client Files - mobile only */}
        <div className={`shrink-0 ${isMobile ? (mobilePanel === "files" ? "flex w-full" : "hidden") : "hidden"}`}>
          <ClientFile
            students={students.map(s => ({ id: s.id, name: s.name, avatar: s.avatar, status: s.status }))}
            onBack={() => setMobilePanel("clients")}
          />
        </div>
      </div>

      {/* Mobile bottom navigation — only when standalone */}
      {!embedded && isMobile && (
        <div className="h-16 border-t border-border bg-card/95 backdrop-blur-lg flex items-center shrink-0 px-2 shadow-[0_-4px_20px_hsl(220_30%_12%_/_0.06)]">
          {([
            { key: "clients" as MobilePanel, icon: Users, label: "לקוחות" },
            { key: "chat" as MobilePanel, icon: MessageSquare, label: "צ'אט" },
            { key: "files" as MobilePanel, icon: FileText, label: "תיקים" },
            { key: "ai" as MobilePanel, icon: Bot, label: "AI", badge: suggestions.length },
          ]).map(({ key, icon: Icon, label, badge }) => (
            <button
              key={key}
              onClick={() => setMobilePanel(key)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl mx-0.5 transition-all duration-200 relative ${
                mobilePanel === key 
                  ? "text-secondary bg-secondary/10" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 transition-transform duration-200 ${mobilePanel === key ? "scale-110" : ""}`} />
              <span className="text-[10px] font-semibold">{label}</span>
              {badge && badge > 0 && (
                <span className="absolute top-1 right-1/2 translate-x-4 w-4.5 h-4.5 rounded-full gradient-accent text-secondary-foreground text-[9px] flex items-center justify-center font-bold shadow-sm">
                  {badge}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={handleGoToTimeline}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl mx-0.5 transition-all duration-200 text-muted-foreground hover:text-foreground"
          >
            <GitBranch className="h-5 w-5" />
            <span className="text-[10px] font-semibold">מסלול</span>
          </button>
        </div>
      )}

      {/* Embedded mobile sub-nav (clients/chat/ai/files panels) */}
      {embedded && isMobile && (
        <div className="h-14 border-t border-white/[0.06] bg-[#0d0d15] flex items-center shrink-0 px-2">
          {([
            { key: "clients" as MobilePanel, icon: Users, label: "לקוחות" },
            { key: "chat" as MobilePanel, icon: MessageSquare, label: "צ'אט" },
            { key: "files" as MobilePanel, icon: FileText, label: "תיקים" },
            { key: "ai" as MobilePanel, icon: Bot, label: "AI", badge: suggestions.length },
          ]).map(({ key, icon: Icon, label, badge }) => (
            <button
              key={key}
              onClick={() => setMobilePanel(key)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl mx-0.5 transition-all duration-200 relative ${
                mobilePanel === key
                  ? "text-indigo-400 bg-indigo-500/10"
                  : "text-gray-600 hover:text-white"
              }`}
            >
              <Icon className={`h-4 w-4 transition-transform duration-200 ${mobilePanel === key ? "scale-110" : ""}`} />
              <span className="text-[9px] font-semibold">{label}</span>
              {badge && badge > 0 && (
                <span className="absolute top-0.5 right-1/2 translate-x-3 w-4 h-4 rounded-full bg-indigo-500 text-white text-[8px] flex items-center justify-center font-bold">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentorDashboard;
