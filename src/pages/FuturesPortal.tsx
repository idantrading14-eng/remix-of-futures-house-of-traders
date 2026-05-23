import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { logout } from "@/lib/auth";
import PortalSidebar from "@/components/student/portal/PortalSidebar";
import PortalTopBar from "@/components/student/portal/PortalTopBar";
import DashboardView from "@/components/student/portal/DashboardView";
import BookmarksView from "@/components/student/portal/BookmarksView";
import SettingsView from "@/components/student/portal/SettingsView";
import StudentCoursesView from "@/components/student/StudentCoursesView";
import StudentChatView from "@/components/student/StudentChatView";
import OnboardingPopup from "@/components/student/OnboardingPopup";

type AccessState = { has_courses_access: boolean; has_mentorchat_access: boolean };

export default function FuturesPortal() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [access, setAccess] = useState<AccessState>({ has_courses_access: false, has_mentorchat_access: false });
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [view, setView] = useState("dashboard");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!profile || (profile.role !== "student" && profile.role !== "manual_client")) { navigate("/"); return; }

      setUserId(user.id);
      setDisplayName(profile.display_name);
      setUserEmail(user.email || "");

      // Check onboarding status
      if (!(profile as any).onboarding_completed) {
        setShowOnboarding(true);
      }

      const { data: acc } = await supabase.from("student_access").select("*").eq("user_id", user.id).single();
      setAccess(acc ? { has_courses_access: acc.has_courses_access, has_mentorchat_access: acc.has_mentorchat_access } : { has_courses_access: false, has_mentorchat_access: false });

      setLoading(false);
    };
    init();
  }, [navigate]);

  // Realtime access updates
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("student-access-updates")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "student_access",
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const updated = payload.new as any;
        setAccess({ has_courses_access: updated.has_courses_access, has_mentorchat_access: updated.has_mentorchat_access });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1a1a1a" }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#d4a017", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const renderContent = () => {
    switch (view) {
      case "dashboard":
        return (
          <DashboardView
            userId={userId!}
            displayName={displayName}
            onNavigate={setView}
            hasCoursesAccess={access.has_courses_access}
          />
        );
      case "courses":
        return (
          <div className="flex-1 overflow-auto">
            <StudentCoursesView userId={userId!} />
          </div>
        );
      case "chat":
        if (!access.has_mentorchat_access) {
          return (
            <div className="flex-1 flex items-center justify-center" dir="rtl">
              <div className="text-center space-y-3 p-8">
                <div className="text-4xl">🔒</div>
                <h2 className="text-xl font-bold text-white">אין לך גישה לצ׳אט עם המנטור</h2>
                <p className="text-gray-400 text-sm">פנה למנטור שלך כדי לקבל גישה</p>
              </div>
            </div>
          );
        }
        return (
          <div className="flex-1 overflow-hidden">
            <StudentChatView userId={userId!} displayName={displayName} />
          </div>
        );
      case "bookmarks":
        return <BookmarksView userId={userId!} onOpenLesson={() => setView("courses")} />;
      case "settings":
        return <SettingsView />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex" dir="rtl" style={{ background: "#1a1a1a" }}>
      {showOnboarding && userId && (
        <OnboardingPopup
          userId={userId}
          displayName={displayName}
          email={userEmail}
          onComplete={() => setShowOnboarding(false)}
        />
      )}
      <PortalSidebar
        activeView={view}
        onNavigate={setView}
        displayName={displayName}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <PortalTopBar displayName={displayName} onNavigate={setView} />

        <main className="flex-1 overflow-auto scrollbar-thin">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
