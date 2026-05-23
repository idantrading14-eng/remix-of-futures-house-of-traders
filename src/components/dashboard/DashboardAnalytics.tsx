import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import StuckStudentsWidget from "./StuckStudentsWidget";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Activity, BookOpen, Users, Clock } from "lucide-react";

type ClientRow = {
  id: string;
  name: string;
  status: string;
  planName: string;
};

type CourseProgress = {
  courseId: string;
  courseTitle: string;
  totalStudents: number;
  avgProgress: number;
};

type ActivityItem = {
  id: string;
  description: string;
  action: string;
  clientName: string;
  createdAt: string;
};

interface DashboardAnalyticsProps {
  clients: ClientRow[];
}

export default function DashboardAnalytics({ clients }: DashboardAnalyticsProps) {
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);

  // Status distribution data
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    clients.forEach(c => {
      const label = c.status === "active" ? "פעיל" : c.status === "pending" ? "ממתין" : c.status === "inactive" ? "לא פעיל" : c.status;
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [clients]);

  const STATUS_COLORS: Record<string, string> = {
    "פעיל": "#2ecc71",
    "ממתין": "#f59e0b",
    "לא פעיל": "#6b7280",
  };

  // Load course progress
  useEffect(() => {
    const load = async () => {
      const { data: courses } = await supabase.from("courses").select("id, title");
      if (!courses || courses.length === 0) { setLoadingCourses(false); return; }

      const { data: enrollments } = await supabase.from("enrollments").select("course_id, client_id");
      const { data: modules } = await supabase.from("modules").select("id, course_id");
      const { data: lessons } = await supabase.from("lessons").select("id, module_id");
      const { data: progress } = await supabase.from("lesson_progress").select("lesson_id, client_id, completed").eq("completed", true);

      if (!enrollments || !modules || !lessons) { setLoadingCourses(false); return; }

      // Build lesson -> course map
      const moduleMap = new Map((modules || []).map(m => [m.id, m.course_id]));
      const lessonCourseMap = new Map<string, string>();
      const courseLessonCount = new Map<string, number>();

      (lessons || []).forEach(l => {
        const courseId = moduleMap.get(l.module_id);
        if (courseId) {
          lessonCourseMap.set(l.id, courseId);
          courseLessonCount.set(courseId, (courseLessonCount.get(courseId) || 0) + 1);
        }
      });

      // Count completed per student per course
      const studentCourseCompleted = new Map<string, number>();
      (progress || []).forEach(p => {
        const courseId = lessonCourseMap.get(p.lesson_id);
        if (courseId) {
          const key = `${p.client_id}:${courseId}`;
          studentCourseCompleted.set(key, (studentCourseCompleted.get(key) || 0) + 1);
        }
      });

      // Enrollment counts per course
      const courseEnrollments = new Map<string, string[]>();
      enrollments.forEach(e => {
        if (!courseEnrollments.has(e.course_id)) courseEnrollments.set(e.course_id, []);
        courseEnrollments.get(e.course_id)!.push(e.client_id);
      });

      const result: CourseProgress[] = courses.map(c => {
        const students = courseEnrollments.get(c.id) || [];
        const totalLessons = courseLessonCount.get(c.id) || 1;
        let totalProgress = 0;
        students.forEach(sid => {
          const completed = studentCourseCompleted.get(`${sid}:${c.id}`) || 0;
          totalProgress += (completed / totalLessons) * 100;
        });
        return {
          courseId: c.id,
          courseTitle: c.title,
          totalStudents: students.length,
          avgProgress: students.length > 0 ? Math.round(totalProgress / students.length) : 0,
        };
      }).filter(c => c.totalStudents > 0);

      setCourseProgress(result);
      setLoadingCourses(false);
    };
    load();
  }, []);

  // Load recent activity
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!data || data.length === 0) {
        // Fallback: use recent messages as activity
        const { data: msgs } = await supabase
          .from("messages")
          .select("id, content, sender_role, student_id, created_at")
          .order("created_at", { ascending: false })
          .limit(10);

        if (msgs) {
          const studentIds = [...new Set(msgs.map(m => m.student_id))];
          const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", studentIds);
          const nameMap = new Map((profiles || []).map(p => [p.id, p.display_name]));

          setActivities(msgs.map(m => ({
            id: m.id,
            description: m.sender_role === "student" ? "שלח הודעה" : m.sender_role === "ai" ? "קיבל תשובת AI" : "קיבל תגובת מנטור",
            action: "message",
            clientName: nameMap.get(m.student_id) || "תלמיד",
            createdAt: m.created_at || "",
          })));
        }
        setLoadingActivity(false);
        return;
      }

      const clientIds = [...new Set(data.map(d => d.client_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", clientIds);
      const nameMap = new Map((profiles || []).map(p => [p.id, p.display_name]));

      setActivities(data.map(d => ({
        id: d.id,
        description: d.description,
        action: d.action,
        clientName: nameMap.get(d.client_id) || "לקוח",
        createdAt: d.created_at,
      })));
      setLoadingActivity(false);
    };
    load();
  }, []);

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "עכשיו";
    if (mins < 60) return `לפני ${mins} דק׳`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `לפני ${hours} שע׳`;
    const days = Math.floor(hours / 24);
    return `לפני ${days} ימים`;
  };

  const getActionIcon = (action: string) => {
    if (action === "message") return "💬";
    if (action === "payment") return "💰";
    if (action === "enrollment") return "📚";
    return "📋";
  };

  return (
    <div className="space-y-4">
      {/* Row 1: Status + Course Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Distribution */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">התפלגות לפי סטטוס</h3>
          </div>

          {clients.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-600 text-sm">אין נתונים</div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.name] || "#6b7280"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#2a2a2a", border: "1px solid #3a3a3a", borderRadius: 8, fontSize: 12, direction: "rtl" }}
                      itemStyle={{ color: "#fff" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2">
                {statusData.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.name] || "#6b7280" }} />
                    <span className="text-gray-400">{s.name}</span>
                    <span className="text-white font-semibold">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Course Progress */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">התקדמות בקורסים</h3>
          </div>

          {loadingCourses ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-10 bg-white/[0.03] rounded-xl animate-pulse" />)}
            </div>
          ) : courseProgress.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-600 text-sm">אין קורסים עם תלמידים רשומים</div>
          ) : (
            <div className="space-y-3 max-h-[200px] overflow-y-auto scrollbar-thin">
              {courseProgress.map(cp => (
                <div key={cp.courseId} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300 truncate max-w-[60%]">{cp.courseTitle}</span>
                    <span className="text-[10px] text-gray-500">{cp.totalStudents} תלמידים</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${cp.avgProgress}%`, background: "linear-gradient(90deg, #2ecc71, #27ae60)" }}
                      />
                    </div>
                    <span className="text-[11px] text-emerald-400 font-medium w-8 text-left">{cp.avgProgress}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Recent Activity + Stuck Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">פעילות אחרונה</h3>
          </div>

          {loadingActivity ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-10 bg-white/[0.03] rounded-xl animate-pulse" />)}
            </div>
          ) : activities.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-600 text-sm">אין פעילות אחרונה</div>
          ) : (
            <div className="space-y-1 max-h-[280px] overflow-y-auto scrollbar-thin">
              {activities.map(a => (
                <div key={a.id} className="flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                  <span className="text-sm mt-0.5">{getActionIcon(a.action)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300">
                      <span className="text-white font-medium">{a.clientName}</span>{" "}
                      {a.description}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-gray-600" />
                      <span className="text-[10px] text-gray-600">{formatTimeAgo(a.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stuck Students */}
        <StuckStudentsWidget />
      </div>
    </div>
  );
}
