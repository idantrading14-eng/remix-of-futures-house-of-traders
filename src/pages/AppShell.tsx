import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { logout } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDivision } from "@/contexts/DivisionContext";
import DivisionSwitcher from "@/components/DivisionSwitcher";
import {
  Home, Users, MessageSquare, GitBranch, Settings, GraduationCap, LogOut,
  ChevronRight, ChevronLeft, ExternalLink, Shield } from
"lucide-react";
import MentorDashboard from "./MentorDashboard";
import DashboardOverview from "./DashboardOverview";
import ClientsPage from "./ClientsPage";
import TimelinePage from "./TimelinePage";
import AccessManagementTab from "@/components/admin/AccessManagementTab";

type View = "dashboard" | "chat" | "clients" | "timeline" | "settings" | "access" | "revenue";

const navItems: {icon: React.ElementType;label: string;view: View | "academy";}[] = [
{ icon: Home, label: "דשבורד", view: "dashboard" },
{ icon: Users, label: "לקוחות", view: "clients" },
{ icon: GraduationCap, label: "קורסים", view: "academy" },
{ icon: MessageSquare, label: "צ'אט עם Agent", view: "chat" },
{ icon: GitBranch, label: "מסלולי התקדמות", view: "timeline" },
{ icon: Shield, label: "ניהול גישות", view: "access" },
{ icon: Settings, label: "הגדרות", view: "settings" }];


export default function AppShell() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { activeDivisionId, activeDivision } = useDivision();
  const [activeView, setActiveView] = useState<View>(() => {
    const v = searchParams.get("view");
    if (v && ["dashboard", "chat", "clients", "timeline", "settings", "access", "revenue"].includes(v)) return v as View;
    return "dashboard";
  });
  const [clientsFilter, setClientsFilter] = useState<string>(() => searchParams.get("filter") || "all");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mentorName, setMentorName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const v = searchParams.get("view");
    if (v && ["dashboard", "chat", "clients", "timeline", "settings", "access", "revenue"].includes(v)) {
      setActiveView(v as View);
      const f = searchParams.get("filter");
      if (f) setClientsFilter(f);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {navigate("/");return;}
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profile?.role !== "mentor") {navigate("/");return;}
      setMentorName(profile.display_name);
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleViewChange = (view: string) => {
    if (view === "logout") {
      handleLogout();
    } else {
      setActiveView(view as View);
    }
  };

  const getInitials = (n: string) =>
  n.split(" ").map((w) => w[0]).join("").slice(0, 2);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0A0A0F]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>);

  }

  return (
    <div className="h-screen flex bg-[#0A0A0F] text-white overflow-hidden dark" dir="rtl">
      {/* ─── Sidebar ─── */}
      <aside
        className={`${sidebarOpen ? "w-60" : "w-16"} shrink-0 bg-[#0d0d15] border-l border-white/[0.06] flex flex-col transition-all duration-300 relative ${
        isMobile && !sidebarOpen ? "hidden" : ""}`
        }>
        
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-white/[0.06]">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-indigo-400" />
          </div>
          {sidebarOpen &&
          <span className="font-bold text-white text-sm tracking-tight">​FUTURES</span>
          }
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = item.view === "academy" ? false : activeView === item.view;
            return (
              <button
                key={idx}
                onClick={() => {
                  if (item.view === "academy") {navigate("/academy");} else
                  {setActiveView(item.view);}
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                isActive ?
                "bg-indigo-500/15 text-indigo-400" :
                "text-gray-500 hover:text-white hover:bg-white/[0.04]"}`
                }>
                
                <Icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </button>);

          })}
        </nav>

        {/* User */}
        <div className="border-t border-white/[0.06] p-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {getInitials(mentorName || "M")}
            </div>
            {sidebarOpen &&
            <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{mentorName}</p>
                <p className="text-[10px] text-gray-600">מנטור</p>
              </div>
            }
            {sidebarOpen &&
            <button onClick={handleLogout} className="text-gray-600 hover:text-rose-400 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            }
          </div>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-20 -left-3 w-6 h-6 rounded-full bg-[#1a1a2e] border border-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-colors z-10">
          
          {sidebarOpen ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* ─── Content area ─── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        {isMobile &&
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/[0.06] bg-[#0d0d15] shrink-0">
            <div className="flex items-center gap-3">
              <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center">
              
                <GraduationCap className="w-4 h-4 text-indigo-400" />
              </button>
              <span className="font-bold text-white text-sm">MentorChat</span>
            </div>
            <button onClick={handleLogout} className="text-gray-500 hover:text-rose-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        }

        {/* Division switcher bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-[#0d0d15]/50 shrink-0">
          <DivisionSwitcher />
          {activeDivision &&
          <span className="text-xs text-gray-500 hidden sm:block">{activeDivision.name}</span>
          }
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          <div className={activeView === "dashboard" ? "h-full" : "hidden"} key={`dash-${activeDivisionId}`}>
            <DashboardOverview />
          </div>
          <div className={activeView === "chat" ? "h-full" : "hidden"} key={`chat-${activeDivisionId}`}>
            <MentorDashboard embedded onViewChange={handleViewChange} showStats={false} />
          </div>
          <div className={activeView === "clients" ? "h-full" : "hidden"} key={`clients-${activeDivisionId}-${clientsFilter}`}>
            <ClientsPage embedded onViewChange={handleViewChange} initialFilter={clientsFilter} />
          </div>
          <div className={activeView === "timeline" ? "h-full" : "hidden"} key={`timeline-${activeDivisionId}`}>
            <TimelinePage embedded onViewChange={handleViewChange} />
          </div>
          <div className={activeView === "access" ? "h-full" : "hidden"} key={`access-${activeDivisionId}`}>
            <AccessManagementTab />
          </div>
          {activeView === "revenue" &&
          <div className="h-full overflow-y-auto">
              <div className="max-w-[1400px] mx-auto p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-white">הכנסות</h1>
                    <p className="text-sm text-gray-500 mt-0.5">סקירת הכנסות חודשית</p>
                  </div>
                  <button onClick={() => setActiveView("dashboard")} className="text-sm text-gray-400 hover:text-white transition-colors">← חזרה לדשבורד</button>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto">
                    <span className="text-3xl">💰</span>
                  </div>
                  <p className="text-gray-400 text-lg font-medium">דף הכנסות — בקרוב</p>
                  <p className="text-gray-600 text-sm">ניתוח הכנסות מפורט נמצא בפיתוח</p>
                </div>
              </div>
            </div>
          }
          {activeView === "settings" &&
          <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto">
                  <Settings className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-500 text-lg font-medium">הגדרות — בקרוב</p>
                <p className="text-gray-600 text-sm">עמוד ההגדרות נמצא בפיתוח</p>
              </div>
            </div>
          }
        </main>

        {/* Mobile bottom nav */}
        {isMobile &&
        <div className="h-16 border-t border-white/[0.06] bg-[#0d0d15] flex items-center shrink-0 px-2">
            {navItems.
          filter((_, i) => i !== 2) /* skip duplicate "צ'אט" entry */.
          map((item, idx) => {
            const Icon = item.icon;
            const isActive = item.view === "academy" ? false : activeView === item.view;
            return (
              <button
                key={idx}
                onClick={() => {
                  if (item.view === "academy") {navigate("/academy");} else
                  {setActiveView(item.view);}
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl mx-0.5 transition-all duration-200 ${
                isActive ?
                "text-indigo-400 bg-indigo-500/10" :
                "text-gray-600 hover:text-white"}`
                }>
                
                    <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
                    <span className="text-[10px] font-semibold">{item.label}</span>
                  </button>);

          })}
          </div>
        }
      </div>
    </div>);

}