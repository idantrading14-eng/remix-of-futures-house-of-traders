import { Search, Bell, Settings } from "lucide-react";

interface Props {
  displayName: string;
  onNavigate: (view: string) => void;
}

export default function PortalTopBar({ displayName, onNavigate }: Props) {
  const initials = displayName.split(" ").map(w => w[0]).join("").slice(0, 2);

  return (
    <header
      className="h-16 flex items-center justify-between px-6 border-b shrink-0"
      style={{ background: "#1a1a1a", borderColor: "rgba(255,255,255,0.06)" }}
    >
      {/* Right side (leading in RTL) — breadcrumb area */}
      <div />

      {/* Left side — search, notifications, avatar */}
      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#555" }} />
          <input
            type="text"
            placeholder="חיפוש..."
            className="pr-9 pl-4 py-2 rounded-lg text-sm w-52 focus:outline-none focus:ring-1"
            style={{
              background: "#2a2a2a",
              border: "1px solid #3a3a3a",
              color: "#ccc",
            }}
          />
        </div>

        <button
          className="p-2 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: "#777" }}
        >
          <Bell className="w-4.5 h-4.5" />
        </button>

        <button
          onClick={() => onNavigate("settings")}
          className="p-2 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: "#777" }}
        >
          <Settings className="w-4.5 h-4.5" />
        </button>

        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: "linear-gradient(135deg, #d4a017, #b8860b)", color: "#111" }}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
