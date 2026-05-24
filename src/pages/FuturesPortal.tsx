import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { logout } from "@/lib/auth";
import PortalSidebar from "@/components/student/portal/PortalSidebar";
import PortalTopBar from "@/components/student/portal/PortalTopBar";
import BookmarksView from "@/components/student/portal/BookmarksView";
import SettingsView from "@/components/student/portal/SettingsView";
import StudentCoursesView from "@/components/student/StudentCoursesView";

export default function FuturesPortal() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("courses");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!profile || (profile.role !== "student" && profile.role !== "manual_client")) { navigate("/"); return; }

      setUserId(user.id);
      setDisplayName(profile.display_name);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const handleLogout = async () => { await logout(); navigate("/"); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1a1a1a" }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#d4a017", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const renderContent = () => {
    switch (view) {
      case "courses":
        return <div className="flex-1 overflow-auto"><StudentCoursesView userId={userId!} /></div>;
      case "bookmarks":
        return <BookmarksView userId={userId!} onOpenLesson={() => setView("courses")} />;
      case "settings":
        return <SettingsView />;
      default:
        return <div className="flex-1 overflow-auto"><StudentCoursesView userId={userId!} /></div>;
    }
  };

  return (
    <div className="h-screen flex" dir="rtl" style={{ background: "#1a1a1a" }}>
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
