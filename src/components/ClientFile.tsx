import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Plus, Trash2, Edit2, Save, X, FileText, User, Search, StickyNote, Calendar } from "lucide-react";
import { toast } from "sonner";

type Student = {
  id: string;
  name: string;
  avatar: string;
  status: "approved" | "pending";
};

type Note = {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

interface ClientFileProps {
  students: Student[];
  onBack?: () => void;
}

const ClientFile = ({ students, onBack }: ClientFileProps) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [search, setSearch] = useState("");

  const approvedStudents = students.filter(s => s.status === "approved" && s.name.includes(search));

  useEffect(() => {
    if (!selectedStudent) return;
    loadNotes(selectedStudent.id);
  }, [selectedStudent]);

  const loadNotes = async (studentId: string) => {
    const { data } = await supabase
      .from("client_notes")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    if (data) setNotes(data);
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedStudent) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("client_notes").insert({
      student_id: selectedStudent.id,
      mentor_id: user.id,
      content: newNote.trim(),
    }).select().single();
    if (error) { toast.error("שגיאה בשמירת הערה"); return; }
    if (data) { setNotes(prev => [data, ...prev]); setNewNote(""); toast.success("הערה נוספה"); }
  };

  const handleDeleteNote = async (id: string) => {
    await supabase.from("client_notes").delete().eq("id", id);
    setNotes(prev => prev.filter(n => n.id !== id));
    toast.success("הערה נמחקה");
  };

  const handleSaveEdit = async (id: string) => {
    if (!editContent.trim()) return;
    await supabase.from("client_notes").update({ content: editContent.trim(), updated_at: new Date().toISOString() }).eq("id", id);
    setNotes(prev => prev.map(n => n.id === id ? { ...n, content: editContent.trim() } : n));
    setEditingId(null);
    toast.success("הערה עודכנה");
  };

  const handleBack = () => {
    if (selectedStudent) {
      setSelectedStudent(null);
    } else {
      onBack?.();
    }
  };

  // Student list view
  if (!selectedStudent) {
    return (
      <div className="flex flex-col h-full w-full bg-background overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border bg-card">
          <div className="flex items-center gap-3 mb-4">
            {onBack && (
              <button onClick={onBack} className="p-2 hover:bg-muted rounded-xl transition-all duration-200 hover:shadow-sm">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center shadow-glow">
              <FileText className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">תיקי לקוחות</h2>
              <p className="text-xs text-muted-foreground">{approvedStudents.length} תלמידים פעילים</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="חיפוש תלמיד..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-muted/60 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 border border-transparent focus:border-secondary/20 transition-all duration-200"
            />
          </div>
        </div>
        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1.5">
          {approvedStudents.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">אין תלמידים</p>
            </div>
          ) : (
            approvedStudents.map(student => (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className="w-full p-3.5 rounded-xl text-right hover:bg-card hover:shadow-card transition-all duration-200 flex items-center gap-3 group"
              >
                <div className="w-11 h-11 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-secondary/25 transition-colors duration-200">
                  {student.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{student.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">לחץ לפתיחת תיק</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50 text-muted-foreground group-hover:bg-secondary/10 group-hover:text-secondary transition-all duration-200">
                  <FileText className="h-4 w-4" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // Student file view with notes
  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-muted rounded-xl transition-all duration-200"
          >
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="w-11 h-11 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center font-bold text-sm shrink-0">
            {selectedStudent.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-foreground">{selectedStudent.name}</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <StickyNote className="h-3 w-3" />
              {notes.length} הערות
            </p>
          </div>
        </div>
      </div>

      {/* Add note */}
      <div className="p-4 border-b border-border bg-card/50">
        <div className="flex gap-2.5">
          <textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            placeholder="הוסף הערה חדשה..."
            className="flex-1 px-4 py-3 rounded-xl bg-muted/60 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 border border-transparent focus:border-secondary/20 resize-none min-h-[72px] transition-all duration-200"
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddNote(); } }}
          />
          <button
            onClick={handleAddNote}
            disabled={!newNote.trim()}
            className="self-end p-3 rounded-xl gradient-accent text-secondary-foreground hover:shadow-glow transition-all duration-200 disabled:opacity-40 disabled:hover:shadow-none"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {notes.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <StickyNote className="h-8 w-8 opacity-30" />
            </div>
            <p className="font-medium text-sm">אין הערות עדיין</p>
            <p className="text-xs mt-1 opacity-70">הוסף הערה ראשונה לתיק הלקוח</p>
          </div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-card transition-all duration-200">
              {editingId === note.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-muted/60 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 resize-none min-h-[72px] transition-all duration-200"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingId(null)} className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200">
                      <X className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleSaveEdit(note.id)} className="p-2 rounded-lg text-secondary hover:bg-secondary/10 transition-all duration-200">
                      <Save className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{note.content}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {new Date(note.created_at).toLocaleDateString("he-IL")} · {new Date(note.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditingId(note.id); setEditContent(note.content); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ClientFile;
