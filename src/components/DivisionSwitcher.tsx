import { useDivision } from "@/contexts/DivisionContext";

export default function DivisionSwitcher() {
  const { divisions, activeDivisionId, setActiveDivisionId } = useDivision();

  if (divisions.length <= 1) return null;

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
      {divisions.map(div => {
        const isActive = div.id === activeDivisionId;
        return (
          <button
            key={div.id}
            onClick={() => setActiveDivisionId(div.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              isActive
                ? "bg-indigo-500/20 text-indigo-400 shadow-sm"
                : "text-gray-500 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            {div.name}
          </button>
        );
      })}
    </div>
  );
}
