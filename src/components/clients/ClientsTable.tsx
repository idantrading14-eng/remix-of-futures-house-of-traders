import { useState } from "react";
import { Copy, MoreHorizontal, Eye, Pencil, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ClientRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  planName: string;
  planColor: string;
  planId?: string;
  currentStage: number;
  totalStages: number;
  stageName: string;
  status: string;
  joinedAt: string;
  onboardingAnswer?: string;
};

type Props = {
  clients: ClientRow[];
  onViewProfile: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function ClientsTable({ clients, onViewProfile, onEdit, onDelete }: Props) {
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "פעיל";
      case "pending": return "ממתין";
      default: return "לא פעיל";
    }
  };

  const getInitials = (name: string) => name.split(" ").map(w => w[0]).join("").slice(0, 2);

  const avatarColors = [
    "bg-indigo-500/20 text-indigo-300",
    "bg-emerald-500/20 text-emerald-300",
    "bg-amber-500/20 text-amber-300",
    "bg-rose-500/20 text-rose-300",
    "bg-violet-500/20 text-violet-300",
    "bg-cyan-500/20 text-cyan-300",
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
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {["שם", "טלפון", "אימייל", "מסלול", "שלב נוכחי", "פרופיל", "סטטוס", "תאריך הצטרפות", "פעולות"].map(h => (
              <th key={h} className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4 first:pr-5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clients.map((client, idx) => (
            <tr
              key={client.id}
              onClick={() => onViewProfile(client.id)}
              className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors duration-200 cursor-pointer group"
            >
              <td className="py-3 px-4 pr-5">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${avatarColors[idx % avatarColors.length]}`}>
                    {getInitials(client.name)}
                  </div>
                  <span className="text-white font-medium text-sm">{client.name}</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <button
                  onClick={(e) => { e.stopPropagation(); copyToClipboard(client.phone, `phone-${client.id}`); }}
                  className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm"
                >
                  {client.phone || "—"}
                  {client.phone && (copiedId === `phone-${client.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-50" />)}
                </button>
              </td>
              <td className="py-3 px-4">
                <button
                  onClick={(e) => { e.stopPropagation(); copyToClipboard(client.email, `email-${client.id}`); }}
                  className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm"
                >
                  {client.email || "—"}
                  {client.email && (copiedId === `email-${client.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-50" />)}
                </button>
              </td>
              <td className="py-3 px-4">
                {client.planName ? (
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
                    style={{
                      backgroundColor: `${client.planColor}15`,
                      color: client.planColor,
                      borderColor: `${client.planColor}30`,
                    }}
                  >
                    {client.planName}
                  </span>
                ) : (
                  <span className="text-gray-600 text-sm">—</span>
                )}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                      style={{ width: `${client.totalStages > 0 ? (client.currentStage / client.totalStages) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {client.currentStage}/{client.totalStages}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4">
                {client.onboardingAnswer ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/[0.06] text-gray-300">
                    {client.onboardingAnswer === "more_time" ? "⏰ הרבה זמן" : client.onboardingAnswer === "more_money" ? "💰 הרבה כסף" : client.onboardingAnswer}
                  </span>
                ) : (
                  <span className="text-gray-600 text-sm">—</span>
                )}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(client.status)}`} />
                  <span className="text-sm text-gray-400">{getStatusLabel(client.status)}</span>
                </div>
              </td>
              <td className="py-3 px-4 text-sm text-gray-400">
                {client.joinedAt ? new Date(client.joinedAt).toLocaleDateString("he-IL") : "—"}
              </td>
              <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#1a1a2e] border-white/10 text-white">
                    <DropdownMenuItem onClick={() => onViewProfile(client.id)} className="hover:bg-white/[0.06] cursor-pointer">
                      <Eye className="w-4 h-4 ml-2" /> צפה בפרופיל
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(client.id)} className="hover:bg-white/[0.06] cursor-pointer">
                      <Pencil className="w-4 h-4 ml-2" /> ערוך
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(client.id)} className="hover:bg-white/[0.06] text-rose-400 cursor-pointer">
                      <Trash2 className="w-4 h-4 ml-2" /> מחק
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
