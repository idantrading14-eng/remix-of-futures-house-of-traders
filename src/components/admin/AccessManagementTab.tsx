import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { useDivision } from "@/contexts/DivisionContext";

type StudentRow = {
  user_id: string;
  display_name: string;
  email: string;
  has_courses_access: boolean;
  has_mentorchat_access: boolean;
};

export default function AccessManagementTab() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeDivisionId } = useDivision();

  const fetchStudents = async () => {
    // Get all student profiles filtered by division
    let query = supabase.from("profiles").select("id, display_name").in("role", ["student", "manual_client"]);
    if (activeDivisionId) query = query.eq("division_id", activeDivisionId);
    const { data: profiles } = await query;
    if (!profiles) { setLoading(false); return; }

    // Get all access records
    const { data: accessRecords } = await supabase.from("student_access").select("*");
    const accessMap = new Map((accessRecords || []).map((a: any) => [a.user_id, a]));

    // Get emails from client_details
    const ids = profiles.map(p => p.id);
    const { data: details } = await supabase.from("client_details").select("student_id, email").in("student_id", ids);
    const emailMap = new Map((details || []).map((d: any) => [d.student_id, d.email || ""]));

    const rows: StudentRow[] = profiles.map(p => {
      const acc = accessMap.get(p.id) as any;
      return {
        user_id: p.id,
        display_name: p.display_name,
        email: emailMap.get(p.id) || "",
        has_courses_access: acc?.has_courses_access || false,
        has_mentorchat_access: acc?.has_mentorchat_access || false,
      };
    });

    setStudents(rows);
    setLoading(false);
  };

  useEffect(() => { fetchStudents(); }, [activeDivisionId]);

  const toggleAccess = async (userId: string, field: "has_courses_access" | "has_mentorchat_access", currentValue: boolean) => {
    const newVal = !currentValue;

    // Check if record exists
    const { data: existing } = await supabase.from("student_access").select("id").eq("user_id", userId).single();
    if (existing) {
      await supabase.from("student_access").update({ [field]: newVal, updated_at: new Date().toISOString() } as any).eq("user_id", userId);
    } else {
      await supabase.from("student_access").insert({ user_id: userId, [field]: newVal } as any);
    }

    // Auto-enroll in all public courses when turning ON course access
    if (field === "has_courses_access" && newVal) {
      const { data: publicCourses } = await supabase.from("courses").select("id").eq("visibility", "public");
      if (publicCourses && publicCourses.length > 0) {
        const { data: existingEnrollments } = await supabase.from("enrollments").select("course_id").eq("client_id", userId);
        const enrolledIds = new Set((existingEnrollments || []).map(e => e.course_id));
        const newEnrollments = publicCourses.filter(c => !enrolledIds.has(c.id)).map(c => ({ client_id: userId, course_id: c.id }));
        if (newEnrollments.length > 0) {
          await supabase.from("enrollments").insert(newEnrollments);
        }
      }
    }

    setStudents(prev => prev.map(s => s.user_id === userId ? { ...s, [field]: newVal } : s));
    toast.success("הגישה עודכנה");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#6366f1", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.15)" }}>
          <Shield className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white font-outfit">ניהול גישות</h2>
          <p className="text-xs text-gray-500">שליטה בגישה של כל תלמיד לקורסים ולצ'אט</p>
        </div>
      </div>

      {students.length === 0 ? (
        <p className="text-center text-gray-500 py-10">אין תלמידים במערכת</p>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">שם</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">אימייל</th>
                <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">📚 קורסים</th>
                <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">💬 MentorChat</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.user_id} className="transition-colors hover:bg-white/[0.02]" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <td className="px-4 py-3 text-sm text-white">{s.display_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{s.email || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <ToggleButton active={s.has_courses_access} onClick={() => toggleAccess(s.user_id, "has_courses_access", s.has_courses_access)} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ToggleButton active={s.has_mentorchat_access} onClick={() => toggleAccess(s.user_id, "has_mentorchat_access", s.has_mentorchat_access)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ToggleButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center w-10 h-10 rounded-lg transition-all"
      style={{
        background: active ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)",
        color: active ? "#10b981" : "#666",
      }}
    >
      {active ? <Check className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
    </button>
  );
}
