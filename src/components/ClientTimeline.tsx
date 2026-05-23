import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, GripVertical, ChevronLeft, ChevronRight, Plus, X, UserPlus, Phone, DollarSign, Hash, StickyNote, Trash2 } from "lucide-react";

const STAGES = [
  { id: 0, name: "פנייה ראשונית", color: "from-slate-400 to-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/20", text: "text-slate-400" },
  { id: 1, name: "שיחת היכרות", color: "from-blue-400 to-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400" },
  { id: 2, name: "הרשמה", color: "from-indigo-400 to-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20", text: "text-indigo-400" },
  { id: 3, name: "אבחון ראשוני", color: "from-violet-400 to-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400" },
  { id: 4, name: "בניית תוכנית", color: "from-purple-400 to-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400" },
  { id: 5, name: "התחלת ליווי", color: "from-fuchsia-400 to-fuchsia-500", bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/20", text: "text-fuchsia-400" },
  { id: 6, name: "אמצע תהליך", color: "from-pink-400 to-pink-500", bg: "bg-pink-500/10", border: "border-pink-500/20", text: "text-pink-400" },
  { id: 7, name: "פרויקט מעשי", color: "from-orange-400 to-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400" },
  { id: 8, name: "סיום והערכה", color: "from-amber-400 to-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400" },
  { id: 9, name: "בוגר", color: "from-emerald-400 to-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400" },
];

type Student = {
  id: string;
  name: string;
  avatar: string;
};

type ClientDetails = {
  phone?: string;
  amount_paid?: number;
  sessions_total?: number;
  notes?: string;
};

type StageMap = Record<string, number>;
type DetailsMap = Record<string, ClientDetails>;

interface ClientTimelineProps {
  students: Student[];
  onBack?: () => void;
  onStudentsChanged?: () => void | Promise<void>;
  autoOpenAddForm?: boolean;
  onAutoOpenConsumed?: () => void;
}

const ClientTimeline = ({ students, onBack, onStudentsChanged, autoOpenAddForm, onAutoOpenConsumed }: ClientTimelineProps) => {
  const [stageMap, setStageMap] = useState<StageMap>({});
  const [detailsMap, setDetailsMap] = useState<DetailsMap>({});
  const [draggedStudent, setDraggedStudent] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", amount: "", sessions: "0", notes: "" });
  const [saving, setSaving] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadStages = useCallback(async () => {
    const { data } = await supabase.from("student_stages").select("student_id, stage");
    const map: StageMap = {};
    if (data) data.forEach((row: any) => { map[row.student_id] = row.stage; });
    students.forEach(s => { if (!(s.id in map)) map[s.id] = 0; });
    setStageMap(map);
  }, [students]);

  const loadDetails = useCallback(async () => {
    const { data } = await supabase.from("client_details").select("*");
    const map: DetailsMap = {};
    if (data) data.forEach((row: any) => {
      map[row.student_id] = {
        phone: row.phone,
        amount_paid: row.amount_paid,
        sessions_total: row.sessions_total,
        notes: row.notes,
      };
    });
    setDetailsMap(map);
  }, []);

  useEffect(() => { loadStages(); loadDetails(); }, [loadStages, loadDetails]);

  useEffect(() => {
    if (autoOpenAddForm) {
      setShowAddForm(true);
      onAutoOpenConsumed?.();
    }
  }, [autoOpenAddForm, onAutoOpenConsumed]);

  const moveStudent = async (studentId: string, newStage: number) => {
    const oldStage = stageMap[studentId];
    if (oldStage === newStage) return;
    setStageMap(prev => ({ ...prev, [studentId]: newStage }));
    const { error } = await supabase.from("student_stages").upsert(
      { student_id: studentId, stage: newStage, updated_at: new Date().toISOString() } as any,
      { onConflict: "student_id" }
    );
    if (error) {
      setStageMap(prev => ({ ...prev, [studentId]: oldStage ?? 0 }));
      toast.error("שגיאה בעדכון שלב");
    } else {
      const student = students.find(s => s.id === studentId);
      toast.success(`${student?.name} הועבר ל${STAGES[newStage].name}`);
    }
  };

  const handleDragStart = (e: React.DragEvent, studentId: string) => {
    setDraggedStudent(studentId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", studentId);
  };

  const handleDragOver = (e: React.DragEvent, stageId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stageId);
  };

  const handleDrop = (e: React.DragEvent, stageId: number) => {
    e.preventDefault();
    const studentId = e.dataTransfer.getData("text/plain");
    if (studentId) moveStudent(studentId, stageId);
    setDraggedStudent(null);
    setDragOverStage(null);
  };

  const handleDragEnd = () => { setDraggedStudent(null); setDragOverStage(null); };

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -350 : 350, behavior: "smooth" });
  };

  const getStudentsInStage = (stageId: number) =>
    students.filter(s => (stageMap[s.id] ?? 0) === stageId);

  const handleAddClient = async () => {
    const name = formData.name.trim();
    if (!name) { toast.error("יש להזין שם מלא"); return; }
    if (name.length > 100) { toast.error("שם ארוך מדי"); return; }

    const phone = formData.phone.trim();
    if (phone && !/^[\d\-+() ]{7,20}$/.test(phone)) { toast.error("מספר טלפון לא תקין"); return; }

    const amount = formData.amount ? parseFloat(formData.amount) : 0;
    if (isNaN(amount) || amount < 0) { toast.error("סכום לא תקין"); return; }

    const sessions = parseInt(formData.sessions) || 0;
    if (sessions < 0 || sessions > 10) { toast.error("מספר פגישות חייב להיות בין 0 ל-10"); return; }

    const notes = formData.notes.trim().slice(0, 1000);

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("לא מחובר");

      const res = await supabase.functions.invoke("add-manual-client", {
        body: {
          name,
          phone: phone || null,
          amount_paid: amount,
          sessions_total: sessions,
          notes: notes || null,
        },
      });

      if (res.error) throw new Error(res.error.message || "שגיאה בהוספת לקוח");
      if (res.data?.error) throw new Error(res.data.error);

      toast.success(`${name} נוסף בהצלחה!`);
      setFormData({ name: "", phone: "", amount: "", sessions: "0", notes: "" });
      setShowAddForm(false);
      await onStudentsChanged?.();
      await loadStages();
      await loadDetails();
    } catch (err: any) {
      toast.error(err.message || "שגיאה בהוספת לקוח");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClient = async (studentId: string, studentName: string) => {
    try {
      // Delete related data first, then profile
      await supabase.from("ai_suggestions").delete().eq("student_id", studentId);
      await supabase.from("messages").delete().eq("student_id", studentId);
      await supabase.from("client_notes").delete().eq("student_id", studentId);
      await supabase.from("client_details").delete().eq("student_id", studentId);
      await supabase.from("student_stages").delete().eq("student_id", studentId);
      const { error } = await supabase.from("profiles").delete().eq("id", studentId);
      if (error) throw error;
      toast.success(`${studentName} נמחק בהצלחה`);
      setConfirmDeleteId(null);
      setSelectedCard(null);
      await onStudentsChanged?.();
      await loadStages();
      await loadDetails();
    } catch (err: any) {
      toast.error("שגיאה במחיקת לקוח");
    }
  };

  // Handle wheel for horizontal scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // Touch-based horizontal scrolling
  const touchStartRef = useRef<{ x: number; scrollLeft: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    touchStartRef.current = { x: e.touches[0].clientX, scrollLeft: el.scrollLeft };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const el = scrollRef.current;
    if (!el || !touchStartRef.current) return;
    const dx = touchStartRef.current.x - e.touches[0].clientX;
    el.scrollLeft = touchStartRef.current.scrollLeft + dx;
  };

  const handleTouchEnd = () => { touchStartRef.current = null; };

  // Mouse drag scrolling on empty areas (not on draggable cards)
  const mouseDownRef = useRef<{ x: number; scrollLeft: number; isDragging: boolean } | null>(null);

  const handleMouseDownScroll = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    if ((e.target as HTMLElement).closest('[draggable="true"]')) return;
    mouseDownRef.current = { x: e.clientX, scrollLeft: el.scrollLeft, isDragging: false };
  };

  const handleMouseMoveScroll = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el || !mouseDownRef.current) return;
    const dx = mouseDownRef.current.x - e.clientX;
    if (Math.abs(dx) > 3) mouseDownRef.current.isDragging = true;
    if (mouseDownRef.current.isDragging) {
      el.scrollLeft = mouseDownRef.current.scrollLeft + dx;
    }
  };

  const handleMouseUpScroll = () => { mouseDownRef.current = null; };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-muted rounded-xl transition-all duration-200">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-foreground">מסלול התקדמות לקוחות</h2>
            <p className="text-xs text-muted-foreground">{students.length} לקוחות · {STAGES.length} שלבים · גרור כדי להזיז</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-indigo-500 text-white hover:bg-indigo-400 transition-all duration-200 text-sm font-medium shrink-0 shadow-lg shadow-indigo-500/25"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">הוסף לקוח</span>
          </button>
          <div className="flex gap-0.5 shrink-0">
            <button onClick={() => scroll("right")} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
              <ChevronRight className="h-5 w-5" />
            </button>
            <button onClick={() => scroll("left")} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar overview */}
      <div className="px-5 py-3 border-b border-border bg-card/50 shrink-0">
        <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted/50">
          {STAGES.map(stage => {
            const count = getStudentsInStage(stage.id).length;
            return (
              <div
                key={stage.id}
                className={`bg-gradient-to-r ${stage.color} transition-all duration-500 rounded-full`}
                style={{ flex: count || 0.15 }}
                title={`${stage.name}: ${count} תלמידים`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-2 px-1">
          <span className="text-[9px] text-muted-foreground/60">{STAGES[STAGES.length - 1].name}</span>
          <span className="text-[9px] text-muted-foreground/60">{STAGES[0].name}</span>
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddForm(false)}>
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-secondary" />
                </div>
                <h3 className="text-lg font-bold text-foreground">הוספת לקוח חדש</h3>
              </div>
              <button onClick={() => setShowAddForm(false)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">שם מלא *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="שם הלקוח"
                  maxLength={100}
                  className="w-full px-4 py-2.5 rounded-xl bg-muted/60 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 border border-transparent focus:border-secondary/20 transition-all"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" /> מספר טלפון
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                  placeholder="050-1234567"
                  maxLength={20}
                  className="w-full px-4 py-2.5 rounded-xl bg-muted/60 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 border border-transparent focus:border-secondary/20 transition-all"
                  dir="ltr"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-muted-foreground" /> סכום ששולם
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
                    placeholder="0"
                    min={0}
                    className="w-full px-4 py-2.5 rounded-xl bg-muted/60 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 border border-transparent focus:border-secondary/20 transition-all"
                    dir="ltr"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" /> מס׳ פגישות
                  </label>
                  <select
                    value={formData.sessions}
                    onChange={e => setFormData(p => ({ ...p, sessions: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-muted/60 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 border border-transparent focus:border-secondary/20 transition-all appearance-none"
                  >
                    {Array.from({ length: 11 }, (_, i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                  <StickyNote className="h-3.5 w-3.5 text-muted-foreground" /> הערות
                </label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                  placeholder="הערות על הלקוח..."
                  maxLength={1000}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-muted/60 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 border border-transparent focus:border-secondary/20 resize-none transition-all"
                />
              </div>
            </div>
            <div className="p-5 border-t border-border flex gap-3 sticky bottom-0 bg-card">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted text-sm font-medium transition-all"
              >
                ביטול
              </button>
              <button
                onClick={handleAddClient}
                disabled={saving || !formData.name.trim()}
                className="flex-1 py-2.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-secondary-foreground/30 border-t-secondary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    הוסף לקוח
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban columns - scrollable both directions */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto cursor-grab active:cursor-grabbing select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDownScroll}
        onMouseMove={handleMouseMoveScroll}
        onMouseUp={handleMouseUpScroll}
        onMouseLeave={handleMouseUpScroll}
      >
        <div className="flex h-max min-h-full min-w-max p-4 gap-3" dir="ltr">
          {STAGES.map(stage => {
            const stageStudents = getStudentsInStage(stage.id);
            const isOver = dragOverStage === stage.id;
            return (
              <div
                key={stage.id}
                className={`w-52 shrink-0 flex flex-col rounded-2xl border transition-all duration-200 ${
                  isOver
                    ? `${stage.border} ${stage.bg} shadow-lg scale-[1.02]`
                    : "border-border bg-card/60"
                }`}
                onDragOver={e => handleDragOver(e, stage.id)}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={e => handleDrop(e, stage.id)}
              >
                {/* Column header */}
                <div className={`p-3 border-b ${stage.border} shrink-0`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2" dir="rtl">
                      <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${stage.color}`} />
                      <span className="text-xs font-bold text-foreground">{stage.name}</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stage.bg} ${stage.text}`}>
                      {stageStudents.length}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1 text-right" dir="rtl">
                    שלב {stage.id + 1} מתוך {STAGES.length}
                  </div>
                </div>

                {/* Students in column */}
                <div className="p-2 space-y-2 min-h-[100px]">
                  {stageStudents.length === 0 && (
                    <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
                      isOver ? `${stage.border}` : "border-border/30"
                    }`}>
                      <p className="text-[10px] text-muted-foreground/50">גרור לכאן</p>
                    </div>
                  )}
                  {stageStudents.map(student => {
                    const details = detailsMap[student.id];
                    const isExpanded = selectedCard === student.id;
                    return (
                      <div
                        key={student.id}
                        draggable
                        onDragStart={e => handleDragStart(e, student.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedCard(isExpanded ? null : student.id)}
                        className={`p-2.5 rounded-xl border border-border bg-background cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 group ${
                          draggedStudent === student.id ? "opacity-40 scale-95" : ""
                        }`}
                        dir="rtl"
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 shrink-0 transition-colors" />
                          <div className={`w-8 h-8 rounded-lg ${stage.bg} ${stage.text} flex items-center justify-center font-bold text-[10px] shrink-0`}>
                            {student.avatar}
                          </div>
                          <span className="text-xs font-medium text-foreground truncate">{student.name}</span>
                        </div>
                        {isExpanded && (
                          <div className="mt-2 pt-2 border-t border-border/50 space-y-1.5 text-[10px] text-muted-foreground" onClick={e => e.stopPropagation()}>
                            {details?.phone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="h-3 w-3" />
                                <span dir="ltr">{details.phone}</span>
                              </div>
                            )}
                            {(details?.amount_paid ?? 0) > 0 && (
                              <div className="flex items-center gap-1.5">
                                <DollarSign className="h-3 w-3" />
                                <span>₪{details?.amount_paid}</span>
                              </div>
                            )}
                            {(details?.sessions_total ?? 0) > 0 && (
                              <div className="flex items-center gap-1.5">
                                <Hash className="h-3 w-3" />
                                <span>{details?.sessions_total} פגישות</span>
                              </div>
                            )}
                            {details?.notes && (
                              <div className="flex items-start gap-1.5">
                                <StickyNote className="h-3 w-3 mt-0.5 shrink-0" />
                                <span className="line-clamp-2">{details.notes}</span>
                              </div>
                            )}
                            {confirmDeleteId === student.id ? (
                              <div className="flex items-center gap-2 mt-1 p-1.5 rounded-lg bg-destructive/10 border border-destructive/20">
                                <span className="text-destructive font-medium flex-1">למחוק?</span>
                                <button
                                  onClick={() => handleDeleteClient(student.id, student.name)}
                                  className="px-2 py-0.5 rounded bg-destructive text-destructive-foreground text-[10px] font-bold hover:bg-destructive/90 transition-colors"
                                >
                                  מחק
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-bold hover:bg-muted/80 transition-colors"
                                >
                                  ביטול
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(student.id)}
                                className="flex items-center gap-1.5 mt-1 text-destructive/70 hover:text-destructive transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>מחק לקוח</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ClientTimeline;
