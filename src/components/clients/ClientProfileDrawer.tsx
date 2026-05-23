import { useState, useEffect } from "react";
import { X, Phone, Mail, Calendar, Clock, CreditCard, CheckCircle2, Circle, Edit, Shield, Check, Lock, BookOpen, Building2, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useDivision } from "@/contexts/DivisionContext";

type ClientProfile = {
  id: string;
  name: string;
  phone: string;
  email: string;
  planName: string;
  planColor: string;
  currentStage: number;
  totalStages: number;
  stageNames: string[];
  status: string;
  joinedAt: string;
  notes: string;
};

type ActivityItem = {
  id: string;
  action: string;
  description: string;
  created_at: string;
};

type PaymentItem = {
  id: string;
  amount: number;
  status: string;
  date: string;
  method: string;
};

type Props = {
  clientId: string | null;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete?: (id: string) => void;
};

export default function ClientProfileDrawer({ clientId, onClose, onEdit, onDelete }: Props) {
  const { divisions } = useDivision();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "payments">("overview");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [accessCourses, setAccessCourses] = useState(false);
  const [accessChat, setAccessChat] = useState(false);
  const [allCourses, setAllCourses] = useState<{ id: string; title: string }[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());
  const [clientDivisionId, setClientDivisionId] = useState<string>("");

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    setActiveTab("overview");

    const fetchAll = async () => {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", clientId).single();
      const { data: details } = await supabase.from("client_details").select("*").eq("student_id", clientId).single();
      const { data: stageData } = await supabase.from("student_stages").select("*").eq("student_id", clientId).single();

      let planName = "";
      let planColor = "#6366F1";
      let totalStages = 8;
      let stageNames: string[] = [];

      if ((details as any)?.plan_id) {
        const { data: plan } = await supabase.from("plans").select("*").eq("id", (details as any).plan_id).single();
        if (plan) {
          planName = plan.name;
          planColor = plan.color;
          totalStages = plan.total_stages;
          stageNames = Array.isArray(plan.stage_names) ? plan.stage_names as string[] : [];
        }
      }

      setClientDivisionId((profile as any)?.division_id || "");
      setClient({
        id: clientId,
        name: profile?.display_name || "",
        phone: details?.phone || "",
        email: (details as any)?.email || "",
        planName,
        planColor,
        currentStage: stageData?.stage || 0,
        totalStages,
        stageNames,
        status: (details as any)?.status || "active",
        joinedAt: profile?.created_at || "",
        notes: details?.notes || "",
      });
      setNotes(details?.notes || "");

      const { data: acts } = await supabase.from("activity_log" as any).select("*").eq("client_id", clientId).order("created_at", { ascending: false }).limit(50);
      if (acts) setActivities(acts as any);

      const { data: pays } = await supabase.from("payments" as any).select("*").eq("client_id", clientId).order("date", { ascending: false });
      if (pays) setPayments(pays as any);

      const { data: acc } = await supabase.from("student_access").select("*").eq("user_id", clientId).single();
      setAccessCourses(acc?.has_courses_access || false);
      setAccessChat(acc?.has_mentorchat_access || false);

      const { data: courses } = await supabase.from("courses").select("id, title");
      setAllCourses((courses || []) as { id: string; title: string }[]);
      const { data: enrollments } = await supabase.from("enrollments").select("course_id").eq("client_id", clientId);
      setEnrolledCourseIds(new Set((enrollments || []).map(e => e.course_id)));

      setLoading(false);
    };

    fetchAll();
  }, [clientId]);

  const saveNotes = async () => {
    if (!clientId) return;
    await supabase.from("client_details").update({ notes: notes.trim() } as any).eq("student_id", clientId);
    setEditingNotes(false);
    toast.success("הערות נשמרו");
  };

  const getStatusColor = (s: string) => s === "active" ? "bg-emerald-500" : s === "pending" ? "bg-amber-500" : "bg-gray-500";
  const getStatusLabel = (s: string) => s === "active" ? "פעיל" : s === "pending" ? "ממתין" : "לא פעיל";
  const getInitials = (n: string) => n.split(" ").map(w => w[0]).join("").slice(0, 2);

  const getActionIcon = (action: string) => {
    if (action.includes("payment") || action.includes("תשלום")) return "💰";
    if (action.includes("stage") || action.includes("שלב")) return "📈";
    if (action.includes("message") || action.includes("הודעה")) return "💬";
    if (action.includes("created") || action.includes("נוסף")) return "✨";
    return "📋";
  };

  const handleDivisionChange = async (newDivisionId: string) => {
    if (!clientId) return;
    setClientDivisionId(newDivisionId);
    await supabase.from("profiles").update({ division_id: newDivisionId } as any).eq("id", clientId);
    toast.success("חטיבה עודכנה בהצלחה");
  };

  const handleDelete = async () => {
    if (!clientId) return;
    setDeleting(true);
    try {
      await supabase.from("activity_log").delete().eq("client_id", clientId);
      await supabase.from("payments").delete().eq("client_id", clientId);
      await supabase.from("client_notes").delete().eq("student_id", clientId);
      await supabase.from("messages").delete().eq("student_id", clientId);
      await supabase.from("ai_suggestions").delete().eq("student_id", clientId);
      await supabase.from("lesson_progress").delete().eq("client_id", clientId);
      await supabase.from("enrollments").delete().eq("client_id", clientId);
      await supabase.from("lesson_bookmarks").delete().eq("user_id", clientId);
      await supabase.from("student_stages").delete().eq("student_id", clientId);
      await supabase.from("student_access").delete().eq("user_id", clientId);
      await supabase.from("client_details").delete().eq("student_id", clientId);
      await supabase.from("profiles").delete().eq("id", clientId);
      
      toast.success("המשתמש נמחק בהצלחה");
      onDelete?.(clientId);
      onClose();
    } catch (err) {
      toast.error("שגיאה במחיקת המשתמש");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!clientId) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mr-auto w-full max-w-lg bg-[#0d0d15] border-r border-white/[0.06] h-full overflow-y-auto animate-slide-in">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0d0d15]/95 backdrop-blur-xl border-b border-white/[0.06] p-5">
          <button onClick={onClose} className="absolute left-4 top-4 w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors">
            <X className="w-4 h-4" />
          </button>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="w-16 h-16 rounded-full bg-white/[0.06]" />
              <div className="w-32 h-5 rounded bg-white/[0.06]" />
            </div>
          ) : client && (
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
                {getInitials(client.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white truncate">{client.name}</h2>
                  <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(client.status)}`} />
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-400">
                  {client.phone && (
                    <a href={`tel:${client.phone}`} className="flex items-center gap-1 hover:text-white transition-colors">
                      <Phone className="w-3.5 h-3.5" /> {client.phone}
                    </a>
                  )}
                  {client.email && (
                    <a href={`mailto:${client.email}`} className="flex items-center gap-1 hover:text-white transition-colors">
                      <Mail className="w-3.5 h-3.5" /> {client.email}
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={() => onEdit(client.id)}
                    className="bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] hover:text-white rounded-lg text-xs h-7 px-3"
                  >
                    <Edit className="w-3 h-3 ml-1" /> ערוך פרופיל
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg text-xs h-7 px-3"
                  >
                    <Trash2 className="w-3 h-3 ml-1" /> מחק
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/[0.06] px-5">
          {[
            { key: "overview" as const, label: "סקירה כללית" },
            { key: "activity" as const, label: "היסטוריית פעילות" },
            { key: "payments" as const, label: "תשלומים" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? "text-indigo-400 border-indigo-500" : "text-gray-500 border-transparent hover:text-gray-300"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5">
          {activeTab === "overview" && client && (
            <div className="space-y-6">
              {/* Plan */}
              {client.planName && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">מסלול</p>
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border"
                    style={{ backgroundColor: `${client.planColor}15`, color: client.planColor, borderColor: `${client.planColor}30` }}
                  >
                    {client.planName}
                  </span>
                </div>
              )}

              {/* Division */}
              {divisions.length > 1 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> חטיבה</p>
                  <Select value={clientDivisionId} onValueChange={handleDivisionChange}>
                    <SelectTrigger className="bg-white/[0.04] border-white/10 text-white rounded-xl w-48">
                      <SelectValue placeholder="בחר חטיבה" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                      {divisions.map(d => (
                        <SelectItem key={d.id} value={d.id} className="hover:bg-white/[0.06]">
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Progress stepper */}
              <div>
                <p className="text-xs text-gray-500 mb-3">מסלול התקדמות</p>
                <div className="space-y-2">
                  {client.stageNames.length > 0 ? client.stageNames.map((name, i) => {
                    const isComplete = i < client.currentStage;
                    const isCurrent = i === client.currentStage;
                    return (
                      <div key={i} className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${isCurrent ? "bg-indigo-500/10 border border-indigo-500/20" : ""}`}>
                        {isComplete ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : isCurrent ? (
                          <div className="w-5 h-5 rounded-full border-2 border-indigo-500 bg-indigo-500/20 shrink-0 animate-pulse" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-600 shrink-0" />
                        )}
                        <span className={`text-sm ${isComplete ? "text-gray-400 line-through" : isCurrent ? "text-white font-medium" : "text-gray-600"}`}>
                          {name}
                        </span>
                      </div>
                    );
                  }) : (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>שלב {client.currentStage + 1} מתוך {client.totalStages}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/[0.03] rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                    <Calendar className="w-3.5 h-3.5" /> תאריך הצטרפות
                  </div>
                  <p className="text-white text-sm">{client.joinedAt ? new Date(client.joinedAt).toLocaleDateString("he-IL") : "—"}</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                    <Clock className="w-3.5 h-3.5" /> סטטוס
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(client.status)}`} />
                    <p className="text-white text-sm">{getStatusLabel(client.status)}</p>
                  </div>
                </div>
              </div>

              {/* Access control */}
              <div>
                <p className="text-xs text-gray-500 mb-3 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> גישות</p>
                <div className="space-y-2">
                  {/* Courses access toggle */}
                  <button
                    onClick={async () => {
                      const newVal = !accessCourses;
                      const { data: existing } = await supabase.from("student_access").select("id").eq("user_id", clientId!).single();
                      if (existing) {
                        await supabase.from("student_access").update({ has_courses_access: newVal, updated_at: new Date().toISOString() } as any).eq("user_id", clientId!);
                      } else {
                        await supabase.from("student_access").insert({ user_id: clientId!, has_courses_access: newVal } as any);
                      }
                      if (newVal) {
                        const { data: pubCourses } = await supabase.from("courses").select("id").eq("visibility", "public");
                        if (pubCourses && pubCourses.length > 0) {
                          const newEnrollments = pubCourses.filter(c => !enrolledCourseIds.has(c.id)).map(c => ({ client_id: clientId!, course_id: c.id }));
                          if (newEnrollments.length > 0) {
                            await supabase.from("enrollments").insert(newEnrollments);
                            setEnrolledCourseIds(prev => {
                              const next = new Set(prev);
                              newEnrollments.forEach(e => next.add(e.course_id));
                              return next;
                            });
                          }
                        }
                      }
                      setAccessCourses(newVal);
                      toast.success(newVal ? "גישה לקורסים נפתחה (נרשם לכל הקורסים הציבוריים)" : "גישה לקורסים ננעלה");
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl transition-colors"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <span className="text-sm text-white">📚 קורסים</span>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
                      background: accessCourses ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)",
                      color: accessCourses ? "#10b981" : "#666",
                    }}>
                      {accessCourses ? <Check className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
                    </div>
                  </button>

                  {/* Course enrollment checkboxes */}
                  {accessCourses && allCourses.length > 0 && (
                    <div className="mr-2 p-3 rounded-xl space-y-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5"><BookOpen className="w-3 h-3" /> קורסים רשומים</p>
                      {allCourses.map(course => {
                        const isEnrolled = enrolledCourseIds.has(course.id);
                        return (
                          <label
                            key={course.id}
                            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-white/[0.03] transition-colors"
                          >
                            <Checkbox
                              checked={isEnrolled}
                              onCheckedChange={async (checked) => {
                                if (checked) {
                                  await supabase.from("enrollments").insert({ client_id: clientId!, course_id: course.id });
                                  setEnrolledCourseIds(prev => new Set([...prev, course.id]));
                                  toast.success(`נרשם ל"${course.title}"`);
                                } else {
                                  await supabase.from("enrollments").delete().eq("client_id", clientId!).eq("course_id", course.id);
                                  setEnrolledCourseIds(prev => {
                                    const next = new Set(prev);
                                    next.delete(course.id);
                                    return next;
                                  });
                                  toast.success(`הוסר מ"${course.title}"`);
                                }
                              }}
                              className="border-white/20 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                            />
                            <span className="text-sm text-gray-300">{course.title}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* MentorChat access toggle */}
                  <button
                    onClick={async () => {
                      const newVal = !accessChat;
                      const { data: existing } = await supabase.from("student_access").select("id").eq("user_id", clientId!).single();
                      if (existing) {
                        await supabase.from("student_access").update({ has_mentorchat_access: newVal, updated_at: new Date().toISOString() } as any).eq("user_id", clientId!);
                      } else {
                        await supabase.from("student_access").insert({ user_id: clientId!, has_mentorchat_access: newVal } as any);
                      }
                      setAccessChat(newVal);
                      toast.success(newVal ? "גישה לצ'אט נפתחה" : "גישה לצ'אט ננעלה");
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl transition-colors"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <span className="text-sm text-white">💬 MentorChat</span>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
                      background: accessChat ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)",
                      color: accessChat ? "#10b981" : "#666",
                    }}>
                      {accessChat ? <Check className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">הערות</p>
                  {editingNotes ? (
                    <Button size="sm" onClick={saveNotes} className="bg-indigo-500 hover:bg-indigo-600 text-white h-6 px-2 text-xs rounded-lg">שמור</Button>
                  ) : (
                    <button onClick={() => setEditingNotes(true)} className="text-xs text-indigo-400 hover:text-indigo-300">ערוך</button>
                  )}
                </div>
                {editingNotes ? (
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="bg-white/[0.04] border-white/10 text-white text-sm rounded-xl min-h-[80px]"
                    placeholder="הוסף הערות..."
                  />
                ) : (
                  <p className="text-sm text-gray-400 whitespace-pre-wrap">{client.notes || "אין הערות"}</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-3">
              {activities.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-8">אין פעילות עדיין</p>
              ) : activities.map(a => (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02]">
                  <span className="text-lg mt-0.5">{getActionIcon(a.action)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{a.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(a.created_at).toLocaleDateString("he-IL")} · {new Date(a.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "payments" && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-white/[0.03] rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">סה"כ שולם</p>
                  <p className="text-lg font-bold text-white">₪{payments.reduce((s, p) => s + Number(p.amount), 0).toLocaleString()}</p>
                </div>
              </div>

              {payments.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-8">אין תשלומים עדיין</p>
              ) : (
                <div className="space-y-2">
                  {payments.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                      <div>
                        <p className="text-sm text-white font-medium">₪{Number(p.amount).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{new Date(p.date).toLocaleDateString("he-IL")} · {p.method || "מזומן"}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "paid" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                        {p.status === "paid" ? "שולם" : "ממתין"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-[#1a1a2e] border border-white/[0.08] rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="text-lg font-bold text-white">מחיקת משתמש</h3>
            <p className="text-sm text-gray-400">
              האם אתה בטוח שברצונך למחוק את <span className="text-white font-medium">{client?.name}</span>? פעולה זו תמחק את כל המידע הקשור למשתמש ולא ניתן לשחזר אותו.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-400 hover:text-white"
              >
                ביטול
              </Button>
              <Button
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? "מוחק..." : "מחק לצמיתות"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
