import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ClientRow } from "./ClientsTable";

type Props = {
  clients: ClientRow[];
  onViewProfile: (id: string) => void;
};

export default function ClientsGrid({ clients, onViewProfile }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("הועתק!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-500";
      case "pending": return "bg-amber-500";
      default: return "bg-gray-500";
    }
  };

  const getInitials = (name: string) => name.split(" ").map(w => w[0]).join("").slice(0, 2);

  const avatarGradients = [
    "from-indigo-500 to-purple-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-violet-500 to-indigo-600",
    "from-cyan-500 to-blue-600",
  ];

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-white/[0.03] flex items-center justify-center mb-4">
          <span className="text-4xl">👥</span>
        </div>
        <p className="text-white text-lg font-medium mb-2">אין לקוחות עדיין</p>
        <p className="text-gray-500 text-sm">הוסף את הלקוח הראשון שלך כדי להתחיל</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {clients.map((client, idx) => (
        <div
          key={client.id}
          onClick={() => onViewProfile(client.id)}
          className="group bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:bg-white/[0.06] hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer"
        >
          <div className="flex flex-col items-center text-center mb-4">
            <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${avatarGradients[idx % avatarGradients.length]} flex items-center justify-center text-white text-lg font-bold mb-3`}>
              {getInitials(client.name)}
            </div>
            <h3 className="text-white font-semibold text-sm">{client.name}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(client.status)}`} />
              {client.planName && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border"
                  style={{
                    backgroundColor: `${client.planColor}15`,
                    color: client.planColor,
                    borderColor: `${client.planColor}30`,
                  }}
                >
                  {client.planName}
                </span>
              )}
            </div>
          </div>

          {/* Progress */}
          <div className="mb-3">
            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
              <span>שלב {client.currentStage}/{client.totalStages}</span>
              <span>{client.stageName}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${client.totalStages > 0 ? (client.currentStage / client.totalStages) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Contact info */}
          <div className="space-y-1.5 text-xs border-t border-white/[0.06] pt-3">
            {client.phone && (
              <button
                onClick={(e) => { e.stopPropagation(); copyToClipboard(client.phone, `g-phone-${client.id}`); }}
                className="flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors w-full"
              >
                {client.phone}
                {copiedId === `g-phone-${client.id}` ? <Check className="w-3 h-3 text-emerald-400 mr-auto" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-50 mr-auto" />}
              </button>
            )}
            {client.email && (
              <button
                onClick={(e) => { e.stopPropagation(); copyToClipboard(client.email, `g-email-${client.id}`); }}
                className="flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors w-full truncate"
              >
                {client.email}
                {copiedId === `g-email-${client.id}` ? <Check className="w-3 h-3 text-emerald-400 mr-auto" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-50 mr-auto" />}
              </button>
            )}
          </div>

          <button
            onClick={() => onViewProfile(client.id)}
            className="w-full mt-3 py-2 rounded-xl text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors border border-indigo-500/20"
          >
            צפה בפרופיל
          </button>
        </div>
      ))}
    </div>
  );
}
