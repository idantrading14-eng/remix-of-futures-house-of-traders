import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type EnrolledStudent = {
  id: string; name: string; email: string; phone: string;
  enrolled_at: string; progress: number; accessSource: "enrollment" | "product";
};

export default function AcademyStudentsTab({ courseId }: { courseId: string }) {
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Get course external_id
      const { data: course } = await supabase.from("courses").select("external_id").eq("id", courseId).single();
      const externalId = course?.external_id;

      // Get enrolled students
      const { data: enrollments } = await supabase.from("enrollments").select("*").eq("course_id", courseId);
      const enrolledIds = new Set((enrollments || []).map((e: any) => e.client_id));
      const enrollmentMap = new Map((enrollments || []).map((e: any) => [e.client_id, e]));

      // Get students with product access
      let productAccessIds: string[] = [];
      if (externalId) {
        const { data: allDetails } = await supabase.from("client_details").select("student_id, email, phone, product_ids");
        if (allDetails) {
          productAccessIds = allDetails
            .filter((d: any) => {
              const pids = Array.isArray(d.product_ids) ? d.product_ids : [];
              return pids.includes(externalId) && !enrolledIds.has(d.student_id);
            })
            .map((d: any) => d.student_id);
        }
      }

      const allIds = [...Array.from(enrolledIds), ...productAccessIds];
      if (allIds.length === 0) { setStudents([]); setLoading(false); return; }

      // Get total lessons for this course
      const { data: modules } = await supabase.from("modules").select("id").eq("course_id", courseId);
      const moduleIds = (modules || []).map((m: any) => m.id);
      let totalLessons = 0;
      let lessonIds: string[] = [];
      if (moduleIds.length > 0) {
        const { data: lessons } = await supabase.from("lessons").select("id").in("module_id", moduleIds);
        totalLessons = lessons?.length || 0;
        lessonIds = (lessons || []).map((l: any) => l.id);
      }

      // Get completion data per student
      const progressMap = new Map<string, number>();
      if (totalLessons > 0 && lessonIds.length > 0) {
        const progressPromises = allIds.map(async (studentId) => {
          const { data } = await supabase
            .from("lesson_progress")
            .select("lesson_id")
            .eq("completed", true)
            .eq("client_id", studentId)
            .in("lesson_id", lessonIds);
          if (data && data.length > 0) {
            progressMap.set(studentId, Math.round((data.length / totalLessons) * 100));
          }
        });
        await Promise.all(progressPromises);
      }

      const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", allIds);
      const { data: details } = await supabase.from("client_details").select("student_id, email, phone").in("student_id", allIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const detailMap = new Map((details || []).map((d: any) => [d.student_id, d]));

      const enriched: EnrolledStudent[] = allIds.map((id) => {
        const profile = profileMap.get(id);
        const detail = detailMap.get(id);
        const enrollment = enrollmentMap.get(id);
        return {
          id,
          name: profile?.display_name || "—",
          email: detail?.email || "—",
          phone: detail?.phone || "—",
          enrolled_at: enrollment?.enrolled_at || "",
          progress: progressMap.get(id) || 0,
          accessSource: enrolledIds.has(id) ? "enrollment" : "product",
        };
      });
      setStudents(enriched);
      setLoading(false);
    };
    load();
  }, [courseId]);

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#ffbd02", borderTopColor: "transparent" }} /></div>;

  if (students.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <Users className="w-12 h-12 mx-auto" style={{ color: "#555" }} />
        <p style={{ color: "#888" }}>אין תלמידים עם גישה לקורס זה</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs mb-3" style={{ color: "#888" }}>{students.length} תלמידים עם גישה</p>
      {students.map((s) => (
        <div key={s.id} className="flex items-center gap-4 p-3 rounded-xl transition-colors" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "linear-gradient(135deg, #ffbd02, #e6a800)", color: "rgb(36,36,34)" }}>
            {s.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate font-outfit">{s.name}</p>
            <p className="text-xs" style={{ color: "#888" }}>{s.email}{s.phone && s.phone !== "—" ? ` · ${s.phone}` : ""}</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full hidden sm:inline-flex" style={{
            background: s.accessSource === "enrollment" ? "rgba(99,102,241,0.15)" : "rgba(255,189,2,0.15)",
            color: s.accessSource === "enrollment" ? "#818cf8" : "#ffbd02",
          }}>
            {s.accessSource === "enrollment" ? "רשום" : "מוצר"}
          </span>
          <div className="w-32 hidden md:block">
            <Progress value={s.progress} className="h-1.5" />
            <p className="text-[10px] mt-1" style={{ color: "#666" }}>{s.progress}% הושלם</p>
          </div>
          {s.enrolled_at && (
            <p className="text-xs hidden lg:block" style={{ color: "#666" }}>
              {new Date(s.enrolled_at).toLocaleDateString("he-IL")}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
