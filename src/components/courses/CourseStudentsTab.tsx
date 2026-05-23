import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type EnrolledStudent = {
  id: string;
  name: string;
  email: string;
  phone: string;
  enrolled_at: string;
  progress: number;
  lastActivity: string;
};

export default function CourseStudentsTab({ courseId }: { courseId: string }) {
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("*")
        .eq("course_id", courseId);

      if (!enrollments || enrollments.length === 0) { setLoading(false); return; }

      const clientIds = enrollments.map((e: any) => e.client_id);
      const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", clientIds);
      const { data: details } = await supabase.from("client_details").select("student_id, email, phone").in("student_id", clientIds);

      // Get total lessons for this course
      const { data: modules } = await supabase.from("modules").select("id").eq("course_id", courseId);
      const moduleIds = (modules || []).map((m: any) => m.id);
      let totalLessons = 0;
      if (moduleIds.length > 0) {
        const { count } = await supabase.from("lessons").select("*", { count: "exact", head: true }).in("module_id", moduleIds);
        totalLessons = count || 0;
      }

      const enriched: EnrolledStudent[] = enrollments.map((e: any) => {
        const profile = (profiles || []).find((p: any) => p.id === e.client_id);
        const detail = (details || []).find((d: any) => d.student_id === e.client_id);
        return {
          id: e.client_id,
          name: profile?.display_name || "—",
          email: detail?.email || "—",
          phone: detail?.phone || "—",
          enrolled_at: e.enrolled_at,
          progress: 0,
          lastActivity: e.enrolled_at,
        };
      });
      setStudents(enriched);
      setLoading(false);
    };
    fetch();
  }, [courseId]);

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

  if (students.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <Users className="w-12 h-12 text-gray-600 mx-auto" />
        <p className="text-gray-500">אין תלמידים רשומים לקורס זה</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {students.map((s) => (
        <div key={s.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-colors">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {s.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">{s.name}</p>
            <p className="text-xs text-gray-500">{s.email}</p>
          </div>
          <div className="w-32 hidden sm:block">
            <Progress value={s.progress} className="h-1.5" />
            <p className="text-[10px] text-gray-600 mt-1">{s.progress}% הושלם</p>
          </div>
          <p className="text-xs text-gray-600 hidden md:block">
            {new Date(s.enrolled_at).toLocaleDateString("he-IL")}
          </p>
        </div>
      ))}
    </div>
  );
}
