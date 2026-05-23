import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  studentId: string;
  studentName: string;
  studentEmail: string;
  open: boolean;
  onClose: () => void;
}

type CourseRow = {
  id: string;
  title: string;
  thumbnail_url: string | null;
};

export default function AccessManagementModal({
  studentId,
  studentName,
  studentEmail,
  open,
  onClose,
}: Props) {
  const [allCourses, setAllCourses] = useState<CourseRow[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<CourseRow | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: courses }, { data: enrollments }] = await Promise.all([
      supabase.from("courses").select("id, title, thumbnail_url"),
      supabase.from("enrollments").select("course_id").eq("client_id", studentId),
    ]);
    setAllCourses(courses || []);
    setEnrolledIds(new Set((enrollments || []).map((e) => e.course_id)));
    setLoading(false);
  };

  useEffect(() => {
    if (open && studentId) fetchData();
  }, [open, studentId]);

  const enrolledCourses = allCourses.filter((c) => enrolledIds.has(c.id));
  const availableCourses = allCourses.filter((c) => !enrolledIds.has(c.id));

  const addAccess = async (courseId: string) => {
    setActionInProgress(courseId);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("enrollments").insert({
      client_id: studentId,
      course_id: courseId,
    });
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    } else {
      setEnrolledIds((prev) => new Set(prev).add(courseId));
      toast({ title: "✓ גישה נוספה בהצלחה" });
    }
    setActionInProgress(null);
  };

  const removeAccess = async (course: CourseRow) => {
    setConfirmRemove(null);
    setActionInProgress(course.id);
    const { error } = await supabase
      .from("enrollments")
      .delete()
      .eq("client_id", studentId)
      .eq("course_id", course.id);
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    } else {
      setEnrolledIds((prev) => {
        const next = new Set(prev);
        next.delete(course.id);
        return next;
      });
      toast({ title: "גישה הוסרה" });
    }
    setActionInProgress(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent
          className="max-w-lg max-h-[85vh] overflow-y-auto p-0"
          style={{
            background: "#1a1a1a",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#fff",
          }}
        >
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-lg font-bold font-outfit text-white">
              ניהול גישות — {studentName}
            </DialogTitle>
            <DialogDescription className="text-sm" style={{ color: "#888" }}>
              {studentEmail}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-12">
              <div
                className="w-6 h-6 border-2 rounded-full animate-spin"
                style={{ borderColor: "#ffbd02", borderTopColor: "transparent" }}
              />
            </div>
          ) : (
            <div className="px-6 pb-6 space-y-5">
              {/* Section A - Active access */}
              <div
                className="rounded-xl p-4 space-y-3"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <h3 className="text-sm font-semibold font-outfit flex items-center gap-2" style={{ color: "#ffbd02" }}>
                  <BookOpen className="w-4 h-4" />
                  גישות פעילות
                </h3>
                {enrolledCourses.length === 0 ? (
                  <p className="text-xs" style={{ color: "#666" }}>
                    אין גישות פעילות כרגע
                  </p>
                ) : (
                  enrolledCourses.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {course.thumbnail_url ? (
                          <img
                            src={course.thumbnail_url}
                            alt=""
                            className="w-8 h-8 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                            style={{ background: "rgba(255,189,2,0.15)" }}
                          >
                            <BookOpen className="w-4 h-4" style={{ color: "#ffbd02" }} />
                          </div>
                        )}
                        <span className="text-sm font-outfit text-white truncate">{course.title}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={actionInProgress === course.id}
                        className="text-xs flex-shrink-0 hover:bg-red-500/20"
                        style={{ color: "#f87171" }}
                        onClick={() => setConfirmRemove(course)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        הסר גישה
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {/* Section B - Add access */}
              <div
                className="rounded-xl p-4 space-y-3"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <h3 className="text-sm font-semibold font-outfit flex items-center gap-2" style={{ color: "#4ade80" }}>
                  <Plus className="w-4 h-4" />
                  הוסף גישה לקורס
                </h3>
                {availableCourses.length === 0 ? (
                  <p className="text-xs" style={{ color: "#666" }}>
                    התלמיד רשום לכל הקורסים
                  </p>
                ) : (
                  availableCourses.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {course.thumbnail_url ? (
                          <img
                            src={course.thumbnail_url}
                            alt=""
                            className="w-8 h-8 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                            style={{ background: "rgba(74,222,128,0.15)" }}
                          >
                            <BookOpen className="w-4 h-4" style={{ color: "#4ade80" }} />
                          </div>
                        )}
                        <span className="text-sm font-outfit text-white truncate">{course.title}</span>
                      </div>
                      <Button
                        size="sm"
                        disabled={actionInProgress === course.id}
                        className="text-xs flex-shrink-0 font-outfit"
                        style={{ background: "#ffbd02", color: "#1a1a1a" }}
                        onClick={() => addAccess(course.id)}
                      >
                        {actionInProgress === course.id ? (
                          <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: "#1a1a1a", borderTopColor: "transparent" }} />
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            הוסף גישה
                          </>
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm remove dialog */}
      <AlertDialog open={!!confirmRemove} onOpenChange={(v) => !v && setConfirmRemove(null)}>
        <AlertDialogContent style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-outfit text-white">
              להסיר גישה ל{confirmRemove?.title}?
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: "#888" }}>
              פעולה זו תמחק את ההתקדמות
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="font-outfit"
              style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)", color: "#fff" }}
            >
              ביטול
            </AlertDialogCancel>
            <AlertDialogAction
              className="font-outfit"
              style={{ background: "#ef4444", color: "#fff" }}
              onClick={() => confirmRemove && removeAccess(confirmRemove)}
            >
              הסר גישה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
