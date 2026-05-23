import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Mail, Settings, BookOpen, X, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import AccessManagementModal from "./AccessManagementModal";

type CourseProgress = {
  courseTitle: string;
  progress: number;
  lastActivity: string | null;
};

interface Props {
  studentId: string | null;
  open: boolean;
  onClose: () => void;
}

export default function AcademyStudentDrawer({ studentId, open, onClose }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [joinDate, setJoinDate] = useState("");
  const [onboardingAnswer, setOnboardingAnswer] = useState<string | null>(null);
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  useEffect(() => {
    if (!studentId || !open) return;
    setLoading(true);

    const load = async () => {
      // Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, created_at")
        .eq("id", studentId)
        .single();

      setName(profile?.display_name || "—");
      setJoinDate(profile?.created_at || "");

      // Client details
      const { data: detail } = await supabase
        .from("client_details")
        .select("email, product_ids")
        .eq("student_id", studentId)
        .single();

      setEmail(detail?.email || "—");

      // Onboarding
      const { data: onboarding } = await supabase
        .from("onboarding_answers")
        .select("time_vs_money")
        .eq("user_id", studentId)
        .single();

      if (onboarding?.time_vs_money) {
        setOnboardingAnswer(
          onboarding.time_vs_money === "more_time"
            ? "יש לי זמן, אין לי כסף"
            : onboarding.time_vs_money === "more_money"
            ? "יש לי כסף, אין לי זמן"
            : onboarding.time_vs_money
        );
      } else {
        setOnboardingAnswer(null);
      }

      // Get courses the student has access to
      const { data: courses } = await supabase.from("courses").select("id, title, external_id");
      const { data: enrollments } = await supabase.from("enrollments").select("course_id").eq("client_id", studentId);

      const enrolledCourseIds = new Set((enrollments || []).map((e: any) => e.course_id));
      const productIds = Array.isArray(detail?.product_ids) ? detail.product_ids : [];

      const accessibleCourses = (courses || []).filter(
        (c) => enrolledCourseIds.has(c.id) || (c.external_id && productIds.includes(c.external_id))
      );

      // Get modules & lessons for those courses
      const courseIds = accessibleCourses.map((c) => c.id);
      if (courseIds.length === 0) {
        setCourseProgress([]);
        setLoading(false);
        return;
      }

      const { data: modules } = await supabase.from("modules").select("id, course_id").in("course_id", courseIds);
      const moduleIds = (modules || []).map((m: any) => m.id);

      let lessons: { id: string; module_id: string }[] = [];
      if (moduleIds.length > 0) {
        const { data } = await supabase.from("lessons").select("id, module_id").in("module_id", moduleIds);
        lessons = data || [];
      }

      // Get progress
      const allLessonIds = lessons.map((l) => l.id);
      let progressRecords: { lesson_id: string; completed_at: string | null }[] = [];
      if (allLessonIds.length > 0) {
        const { data } = await supabase
          .from("lesson_progress")
          .select("lesson_id, completed_at")
          .eq("client_id", studentId)
          .eq("completed", true)
          .in("lesson_id", allLessonIds);
        progressRecords = data || [];
      }

      const completedSet = new Set(progressRecords.map((p) => p.lesson_id));

      const cpArr: CourseProgress[] = accessibleCourses.map((course) => {
        const cModuleIds = (modules || []).filter((m: any) => m.course_id === course.id).map((m: any) => m.id);
        const cLessons = lessons.filter((l) => cModuleIds.includes(l.module_id));
        const total = cLessons.length;
        const completed = cLessons.filter((l) => completedSet.has(l.id)).length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Find latest activity
        const relevantProgress = progressRecords.filter((p) =>
          cLessons.some((l) => l.id === p.lesson_id)
        );
        const lastActivity = relevantProgress.length > 0
          ? relevantProgress.sort((a, b) => (b.completed_at || "").localeCompare(a.completed_at || ""))[0]?.completed_at
          : null;

        return { courseTitle: course.title, progress, lastActivity };
      });

      setCourseProgress(cpArr);
      setLoading(false);
    };

    load();
  }, [studentId, open]);

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

  return (
    <>
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[420px] p-0 border-r-0 overflow-y-auto scrollbar-thin"
        style={{ background: "#1a1a1a", borderLeft: "1px solid rgba(255,255,255,0.08)" }}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>פרטי תלמיד</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "#ffbd02", borderTopColor: "transparent" }} />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col items-center text-center gap-3 pt-2">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold font-outfit"
                style={{ background: "linear-gradient(135deg, #ffbd02, #e6a800)", color: "#1a1a1a" }}
              >
                {initials}
              </div>
              <div>
                <h2 className="text-xl font-bold font-outfit text-white">{name}</h2>
                <p className="text-sm mt-1" style={{ color: "#888" }}>{email}</p>
                {joinDate && (
                  <p className="text-xs mt-1" style={{ color: "#666" }}>
                    הצטרף ב־{new Date(joinDate).toLocaleDateString("he-IL")}
                  </p>
                )}
              </div>
            </div>

            {/* Onboarding Section */}
            <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList className="w-4 h-4" style={{ color: "#ffbd02" }} />
                <h3 className="text-sm font-semibold font-outfit text-white">נתוני אונבורדינג</h3>
              </div>
              {onboardingAnswer ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>
                  {onboardingAnswer}
                </span>
              ) : (
                <p className="text-xs" style={{ color: "#666" }}>לא מילא שאלון</p>
              )}
            </div>

            {/* Course Progress Section */}
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4" style={{ color: "#ffbd02" }} />
                <h3 className="text-sm font-semibold font-outfit text-white">התקדמות בקורסים</h3>
              </div>
              {courseProgress.length === 0 ? (
                <p className="text-xs" style={{ color: "#666" }}>אין קורסים</p>
              ) : (
                courseProgress.map((cp) => (
                  <div key={cp.courseTitle} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-white font-outfit">{cp.courseTitle}</p>
                      <span className="text-[10px]" style={{ color: "#888" }}>{cp.progress}%</span>
                    </div>
                    <Progress value={cp.progress} className="h-1.5" />
                    {cp.lastActivity && (
                      <p className="text-[10px]" style={{ color: "#555" }}>
                        פעילות אחרונה: {new Date(cp.lastActivity).toLocaleDateString("he-IL")}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 className="text-sm font-semibold font-outfit text-white mb-3">פעולות מהירות</h3>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 font-outfit"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#fff" }}
                onClick={() => {
                  if (email && email !== "—") window.open(`mailto:${email}`, "_blank");
                }}
              >
                <Mail className="w-4 h-4" style={{ color: "#ffbd02" }} />
                שלח הודעה
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 font-outfit"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#fff" }}
                onClick={() => setAccessModalOpen(true)}
              >
                <Settings className="w-4 h-4" style={{ color: "#ffbd02" }} />
                נהל גישות
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>

    <AccessManagementModal
      studentId={studentId || ""}
      studentName={name}
      studentEmail={email}
      open={accessModalOpen}
      onClose={() => setAccessModalOpen(false)}
    />
  </>
  );
}
