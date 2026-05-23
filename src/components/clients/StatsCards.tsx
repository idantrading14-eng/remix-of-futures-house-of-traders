import { Users, UserCheck, UserPlus, TrendingUp, DollarSign, ArrowLeft } from "lucide-react";

type StatsCardsProps = {
  totalClients: number;
  activeClients: number;
  newClientsThisMonth: number;
  averageStage: number;
  monthlyRevenue: number;
  onCardClick?: (key: string) => void;
};

const cards = [
  { key: "total", label: "סה\"כ לקוחות", icon: Users, color: "from-indigo-500/20 to-indigo-600/5", iconColor: "text-indigo-400", glowColor: "hover:shadow-indigo-500/20" },
  { key: "active", label: "לקוחות פעילים", icon: UserCheck, color: "from-emerald-500/20 to-emerald-600/5", iconColor: "text-emerald-400", glowColor: "hover:shadow-emerald-500/20" },
  { key: "new", label: "חדשים החודש", icon: UserPlus, color: "from-violet-500/20 to-violet-600/5", iconColor: "text-violet-400", glowColor: "hover:shadow-violet-500/20" },
  { key: "stage", label: "שלב ממוצע", icon: TrendingUp, color: "from-amber-500/20 to-amber-600/5", iconColor: "text-amber-400", glowColor: "hover:shadow-amber-500/20" },
  { key: "revenue", label: "הכנסה חודשית", icon: DollarSign, color: "from-rose-500/20 to-rose-600/5", iconColor: "text-rose-400", glowColor: "hover:shadow-rose-500/20" },
] as const;

export default function StatsCards({ totalClients, activeClients, newClientsThisMonth, averageStage, monthlyRevenue, onCardClick }: StatsCardsProps) {
  const getValue = (key: string) => {
    switch (key) {
      case "total": return totalClients.toString();
      case "active": return activeClients.toString();
      case "new": return newClientsThisMonth.toString();
      case "stage": return averageStage.toFixed(1);
      case "revenue": return `₪${monthlyRevenue.toLocaleString()}`;
      default: return "0";
    }
  };

  const getSubtext = (key: string) => {
    switch (key) {
      case "active": return `${totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0}% מהסה"כ`;
      case "new": return "החודש הנוכחי";
      case "stage": return "ממוצע כללי";
      case "revenue": return "סה\"כ חודשי";
      default: return "";
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            onClick={() => onCardClick?.(card.key)}
            className={`relative group bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:bg-white/[0.08] ${card.glowColor} hover:shadow-lg cursor-pointer`}
          >
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            <div className="relative z-10">
              <div className={`w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center mb-3 ${card.iconColor}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-white mb-1">{getValue(card.key)}</p>
              <p className="text-xs text-gray-500">{card.label}</p>
              {getSubtext(card.key) && (
                <p className="text-[10px] text-gray-600 mt-1">{getSubtext(card.key)}</p>
              )}
            </div>
            <ArrowLeft className="absolute bottom-3 left-3 w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        );
      })}
    </div>
  );
}