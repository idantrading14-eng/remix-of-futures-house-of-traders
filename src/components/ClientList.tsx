import { useState } from "react";
import { Search, Users, Clock, CheckCircle, Trash2 } from "lucide-react";

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

type Filter = "all" | "waiting" | "pending";

interface ClientListProps {
  students: Student[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  onApprove: (id: string) => void;
  onDelete?: (id: string, name: string) => void;
}

const ClientList = ({ students, selectedId, onSelect, filter, onFilterChange, onApprove, onDelete }: ClientListProps) => {
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = students.filter((s) => {
    if (filter === "waiting") return s.waitingForReply && s.status === "approved";
    if (filter === "pending") return s.status === "pending";
    return s.status === "approved";
  }).filter((s) => s.name.includes(search));

  const counts = {
    all: students.filter(s => s.status === "approved").length,
    waiting: students.filter(s => s.waitingForReply && s.status === "approved").length,
    pending: students.filter(s => s.status === "pending").length,
  };

  return (
    <div className="flex flex-col h-full w-full bg-card overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border">
        <h2 className="text-lg font-bold text-foreground mb-3.5">לקוחות</h2>
        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="חיפוש..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-muted/60 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 border border-transparent focus:border-secondary/20 transition-all duration-200"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border text-sm px-1">
        {([
          { key: "all" as Filter, label: "הכל", icon: Users, count: counts.all },
          { key: "waiting" as Filter, label: "ממתינים", icon: Clock, count: counts.waiting },
          { key: "pending" as Filter, label: "לאישור", icon: CheckCircle, count: counts.pending },
        ]).map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 transition-all duration-200 font-medium relative rounded-lg mx-0.5 ${
              filter === key
                ? "bg-indigo-500 text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {count > 0 && (
              <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-semibold ${
                filter === key ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              }`}>
                {count}
              </span>
            )}
            {filter === key && (
              <span className="absolute bottom-0 inset-x-2 h-0.5 rounded-full bg-indigo-400" />
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-0.5">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">אין תוצאות</p>
          </div>
        ) : (
          filtered.map((student) => (
            <div key={student.id}>
              {student.status === "pending" ? (
                <div className="p-3 rounded-xl animate-fade-in mx-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-warning/15 text-warning flex items-center justify-center font-bold text-sm shrink-0">
                      {student.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{student.name}</p>
                      <p className="text-xs text-muted-foreground">ממתין לאישור</p>
                    </div>
                    <button
                      onClick={() => onApprove(student.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-success text-success-foreground text-xs font-semibold hover:shadow-sm hover:opacity-90 transition-all duration-200"
                    >
                      אשר
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => onSelect(student.id)}
                  className={`w-full p-3 rounded-xl text-right transition-all duration-200 animate-fade-in mx-1 ${
                    selectedId === student.id 
                      ? "bg-secondary/10 shadow-sm border border-secondary/20" 
                      : "hover:bg-muted/50"
                  }`}
                  style={{ width: "calc(100% - 0.5rem)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors duration-200 ${
                      student.waitingForReply
                        ? "bg-warning/15 text-warning"
                        : selectedId === student.id
                        ? "bg-secondary/20 text-secondary"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {student.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm text-foreground">{student.name}</p>
                        <span className="text-[10px] text-muted-foreground">{student.lastMessageTime}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{student.lastMessage}</p>
                    </div>
                    {student.unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full gradient-accent text-secondary-foreground text-[10px] flex items-center justify-center font-bold shrink-0 shadow-glow">
                        {student.unreadCount}
                      </span>
                    )}
                  </div>
                  {onDelete && confirmDeleteId === student.id ? (
                    <div className="flex items-center gap-1.5 mt-2 p-1.5 rounded-lg bg-destructive/10 border border-destructive/20" onClick={e => e.stopPropagation()}>
                      <span className="text-[10px] text-destructive font-medium flex-1">למחוק את {student.name}?</span>
                      <button
                        onClick={() => { onDelete(student.id, student.name); setConfirmDeleteId(null); }}
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
                  ) : onDelete ? (
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmDeleteId(student.id); }}
                      className="mt-1.5 flex items-center gap-1 text-[10px] text-destructive/50 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  ) : null}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ClientList;
