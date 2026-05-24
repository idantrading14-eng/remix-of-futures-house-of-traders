import { useState } from "react";
import {
  BookOpen,
  Bookmark,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

type NavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  section: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: "courses", label: "הקורסים שלי", icon: <BookOpen className="w-5 h-5" />, section: "תוכן" },
  { key: "bookmarks", label: "סימניות", icon: <Bookmark className="w-5 h-5" />, section: "תוכן" },
  { key: "settings", label: "הגדרות", icon: <Settings className="w-5 h-5" />, section: "מערכת" },
];

const SECTIONS = ["תוכן", "מערכת"];

interface Props {
  activeView: string;
  onNavigate: (view: string) => void;
  displayName: string;
  onLogout: () => void;
}

export default function PortalSidebar({ activeView, onNavigate, displayName, onLogout }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = displayName.split(" ").map(w => w[0]).join("").slice(0, 2);

  const sidebarContent = (
    <div className="flex flex-col h-full" style={{ background: "#111111" }}>
      {/* Logo */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold font-outfit" style={{ color: "#d4a017" }}>
          Futures
        </h1>
        <div className="mt-1 h-px w-8" style={{ background: "#d4a017" }} />
      </div>

      {/* User profile */}
      <div className="px-6 py-5 mx-4 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.03)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, #d4a017, #b8860b)", color: "#111" }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{displayName}</p>
            <p className="text-xs" style={{ color: "#777" }}>תלמיד</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto scrollbar-thin">
        {SECTIONS.map(section => {
          const items = NAV_ITEMS.filter(i => i.section === section);
          if (items.length === 0) return null;
          return (
            <div key={section} className="mb-5">
              <p
                className="px-3 mb-2 text-[10px] font-semibold tracking-[0.15em] uppercase"
                style={{ color: "#555" }}
              >
                {section}
              </p>
              <div className="space-y-0.5">
                {items.map(item => {
                  const isActive = activeView === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => { onNavigate(item.key); setMobileOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                      style={{
                        background: isActive ? "rgba(212, 160, 23, 0.1)" : "transparent",
                        color: isActive ? "#d4a017" : "#aaa",
                      }}
                    >
                      <span style={{ color: isActive ? "#d4a017" : "#666" }}>{item.icon}</span>
                      <span>{item.label}</span>
                      {isActive && (
                        <div className="mr-auto w-1.5 h-1.5 rounded-full" style={{ background: "#d4a017" }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-6">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
          style={{ color: "#666" }}
        >
          <LogOut className="w-4 h-4" />
          <span>יציאה</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[260px] h-screen sticky top-0 shrink-0 border-l" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {sidebarContent}
      </aside>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 right-4 z-50 p-2 rounded-lg"
        style={{ background: "#222", color: "#d4a017" }}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative w-[280px] h-full animate-slide-in" style={{ background: "#111111" }}>
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 left-4 p-1.5 rounded-lg"
              style={{ color: "#888" }}
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
