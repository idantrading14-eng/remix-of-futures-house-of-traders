import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Check, ChevronLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type StuckStudent = {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  daysAgo: number;
  reminderSent: boolean;
};

interface StuckStudentsWidgetProps {
  showAll?: boolean;
}

export default function StuckStudentsWidget({ showAll = false }: StuckStudentsWidgetProps) {
  const [students, setStudents] = useState<StuckStudent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStuckStudents = async () => {
    // Get all students
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, created_at")
      .in("role", ["student", "manual_client"]);

    if (!profiles || profiles.length === 0) {
      setStudents([]);
      setLoading(false);
      return;
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Filter students who joined more than 7 days ago
    const oldStudents = profiles.filter(p => {
      if (!p.created_at) return false;
      return new Date(p.created_at) < sevenDaysAgo;
    });

    if (oldStudents.length === 0) {
      setStudents([]);
      setLoading(false);
      return;
    }

    const ids = oldStudents.map(s => s.id);

    // Get lesson progress for these students
    const { data: progress } = await supabase
      .from("lesson_progress")
      .select("client_id, completed")
      .in("client_id", ids)
      .eq("completed", true);

    const studentsWithProgress = new Set((progress || []).map(p => p.client_id));

    // Get emails from client_details
    const { data: details } = await supabase
      .from("client_details")
      .select("student_id, email")
      .in("student_id", ids);

    const emailMap = new Map((details || []).map(d => [d.student_id, d.email || ""]));

    // Get sent reminders
    const { data: reminders } = await supabase
      .from("student_reminders")
      .select("student_id")
      .in("student_id", ids)
      .eq("reminder_type", "stuck");

    const reminderSet = new Set((reminders || []).map(r => r.student_id));

    // Filter stuck students (0 progress)
    const stuck: StuckStudent[] = oldStudents
      .filter(s => !studentsWithProgress.has(s.id))
      .map(s => {
        const daysAgo = Math.floor((Date.now() - new Date(s.created_at!).getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: s.id,
          name: s.display_name,
          email: emailMap.get(s.id) || "",
          joinedAt: s.created_at || "",
          daysAgo,
          reminderSent: reminderSet.has(s.id),
        };
      })
      .sort((a, b) => b.daysAgo - a.daysAgo);

    setStudents(stuck);
    setLoading(false);
  };

  useEffect(() => {
    loadStuckStudents();
  }, []);

  const sendReminder = async (student: StuckStudent) => {
    const subject = encodeURIComponent(`היי ${student.name}, הקורס שלך מחכה לך 👋`);
    const body = encodeURIComponent("שמנו לב שעדיין לא התחלת את הקורס. אנחנו כאן לכל שאלה!");
    window.open(`mailto:${student.email}?subject=${subject}&body=${body}`, "_self");

    // Mark as sent
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("student_reminders").insert({
        student_id: student.id,
        sent_by: user.id,
        reminder_type: "stuck",
      });
    }

    setStudents(prev =>
      prev.map(s => s.id === student.id ? { ...s, reminderSent: true } : s)
    );
    toast.success("התזכורת נשלחה!");
  };

  const getInitials = (name: string) =>
    name.split(" ").map(w => w[0]).join("").slice(0, 2);

  const avatarColors = [
    "bg-rose-500/20 text-rose-300",
    "bg-amber-500/20 text-amber-300",
    "bg-violet-500/20 text-violet-300",
    "bg-cyan-500/20 text-cyan-300",
    "bg-indigo-500/20 text-indigo-300",
  ];

  const displayStudents = showAll ? students : students.slice(0, 5);
  const hasMore = !showAll && students.length > 5;

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-4 h-4 text-rose-400" />
        <h3 className="text-sm font-semibold text-white">תלמידים תקועים 🔔</h3>
        {students.length > 0 && (
          <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded-full">
            {students.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-white/[0.03] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
          כל התלמידים פעילים 🎉
        </div>
      ) : (
        <div className="space-y-1 max-h-[280px] overflow-y-auto scrollbar-thin">
          {displayStudents.map((student, idx) => (
            <div
              key={student.id}
              className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarColors[idx % avatarColors.length]}`}
              >
                {getInitials(student.name)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white font-medium truncate">
                    {student.name}
                  </span>
                  {student.reminderSent && (
                    <span className="flex items-center gap-0.5 text-[10px] text-emerald-400">
                      <Check className="w-3 h-3" />
                      נשלחה תזכורת
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 truncate">{student.email || "אין אימייל"}</p>
              </div>

              <span className="text-[10px] text-gray-600 whitespace-nowrap shrink-0">
                הצטרף לפני {student.daysAgo} ימים
              </span>

              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 shrink-0 h-7 px-2"
                onClick={() => sendReminder(student)}
                disabled={!student.email}
              >
                <Mail className="w-3 h-3 ml-1" />
                שלח תזכורת
              </Button>
            </div>
          ))}

          {hasMore && (
            <button className="w-full text-center text-xs text-indigo-400 hover:text-indigo-300 py-2 transition-colors flex items-center justify-center gap-1">
              הצג הכל ({students.length})
              <ChevronLeft className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
