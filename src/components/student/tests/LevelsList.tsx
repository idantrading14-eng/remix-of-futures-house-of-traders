import { ClipboardCheck, ChevronLeft } from "lucide-react";
import type { Level } from "./types";

export default function LevelsList({ levels, onSelect }: { levels: Level[]; onSelect: (id: string) => void }) {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold font-outfit text-white">מבחנים</h1>
        <p className="text-sm mt-1" style={{ color: "#888" }}>בחר את הרמה שבה אתה נמצא ותתחיל לתרגל</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {levels.map((lvl, i) => (
          <button
            key={lvl.id}
            onClick={() => onSelect(lvl.id)}
            className="text-right p-5 rounded-2xl transition-all hover:-translate-y-0.5 group"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(212,160,23,0.12)" }}
              >
                <ClipboardCheck className="w-6 h-6" style={{ color: "#d4a017" }} />
              </div>
              <div
                className="text-2xl font-bold font-outfit"
                style={{ color: "rgba(212,160,23,0.3)" }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
            </div>
            <h3 className="font-bold font-outfit text-lg text-white mb-1">{lvl.title}</h3>
            <p className="text-xs" style={{ color: "#888" }}>
              {lvl.questions.length} שאלות
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs" style={{ color: "#d4a017" }}>
              <span>התחל מבחן</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
