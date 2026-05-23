import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDivision } from "@/contexts/DivisionContext";
import {
  Users, TrendingUp, ChevronDown, ChevronLeft, Phone, Mail, Copy, Check,
} from "lucide-react";
import StatsCards from "@/components/clients/StatsCards";
import DashboardAnalytics from "@/components/dashboard/DashboardAnalytics";
import ClientProfileDrawer from "@/components/clients/ClientProfileDrawer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type Plan = { id: string; name: string; color: string; total_stages: number; stage_names: string[] };

type ClientRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  planName: string;
  planColor: string;
  planId: string;
  currentStage: number;
  totalStages: number;
  stageName: string;
  status: string;
  joinedAt: string;
};

export default function DashboardOverview() {
  const navigate = useNavigate();
  const { activeDivisionId } = useDivision();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [collapsedPlans, setCollapsedPlans] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/"); return; }

    const { data: plansData } = await supabase.from("plans").select("*");
    const plansMap = new Map<string, Plan>();
    if (plansData) {
      const mapped = plansData.map((p: any) => ({ ...p, stage_names: Array.isArray(p.stage_names) ? p.stage_names : [] }));
      mapped.forEach(p => plansMap.set(p.id, p));
      setPlans(mapped);
    }

    let query = supabase.from("profiles").select("*").in("role", ["student", "manual_client"]);
    if (activeDivisionId) query = query.eq("division_id", activeDivisionId);
    const { data: profiles } = await query;
    if (!profiles) { setClients([]); setLoading(false); return; }

    const ids = profiles.map(p => p.id);
    const { data: details } = await supabase.from("client_details").select("*").in("student_id", ids);
    const { data: stages } = await supabase.from("student_stages").select("*").in("student_id", ids);

    const detailsMap = new Map((details || []).map((d: any) => [d.student_id, d]));
    const stagesMap = new Map((stages || []).map((s: any) => [s.student_id, s]));

    const rows: ClientRow[] = profiles.map(p => {
      const d = detailsMap.get(p.id) as any;
      const s = stagesMap.get(p.id) as any;
      const plan = d?.plan_id ? plansMap.get(d.plan_id) : undefined;
      return {
        id: p.id, name: p.display_name, phone: d?.phone || "", email: d?.email || "",
        planName: plan?.name || "", planColor: plan?.color || "#6366F1", planId: d?.plan_id || "",
        currentStage: s?.stage || 0, totalStages: plan?.total_stages || 8,
        stageName: plan?.stage_names?.[s?.stage || 0] || `שלב ${(s?.stage || 0) + 1}`,
        status: d?.status || "active", joinedAt: p.created_at || "",
      };
    });

    setClients(rows);
    setLoading(false);
  }, [navigate, activeDivisionId]);

  useEffect(() => { loadData(); }, [loadData]);

  const stats = useMemo(() => {
    const total = clients.length;
    const active = clients.filter(c => c.status === "active").length;
    const now = new Date();
    const thisMonth = clients.filter(c => {
      if (!c.joinedAt) return false;
      const d = new Date(c.joinedAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const avgStage = total > 0 ? clients.reduce((s, c) => s + c.currentStage, 0) / total : 0;
    return { total, active, thisMonth, avgStage, revenue: 0 };
  }, [clients]);

  const groupedByPlan = useMemo(() => {
    const groups: { plan: Plan | null; planKey: string; clients: ClientRow[] }[] = [];
    const planMap = new Map<string, ClientRow[]>();
    const noPlan: ClientRow[] = [];
    for (const c of clients) {
      if (!c.planId) { noPlan.push(c); } else {
        if (!planMap.has(c.planId)) planMap.set(c.planId, []);
        planMap.get(c.planId)!.push(c);
      }
    }
    for (const plan of plans) {
      const cls = planMap.get(plan.id);
      if (cls && cls.length > 0) groups.push({ plan, planKey: plan.id, clients: cls });
    }
    if (noPlan.length > 0) groups.push({ plan: null, planKey: "__none__", clients: noPlan });
    return groups;
  }, [clients, plans]);

  const togglePlan = (planKey: string) => {
    setCollapsedPlans(prev => {
      const next = new Set(prev);
      if (next.has(planKey)) next.delete(planKey); else next.add(planKey);
      return next;
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("הועתק!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getInitials = (n: string) => n.split(" ").map(w => w[0]).join("").slice(0, 2);
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-500";
      case "pending": return "bg-amber-500";
      default: return "bg-gray-500";
    }
  };

  const avatarColors = [
    "bg-indigo-500/20 text-indigo-300", "bg-emerald-500/20 text-emerald-300",
    "bg-amber-500/20 text-amber-300", "bg-rose-500/20 text-rose-300",
    "bg-violet-500/20 text-violet-300", "bg-cyan-500/20 text-cyan-300",
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">דשבורד</h1>
          <p className="text-sm text-gray-500 mt-0.5">סקירה כללית של כל הלקוחות והנתונים</p>
        </div>

        {/* Stats */}
        <StatsCards
          totalClients={stats.total}
          activeClients={stats.active}
          newClientsThisMonth={stats.thisMonth}
          averageStage={stats.avgStage}
          monthlyRevenue={stats.revenue}
          onCardClick={(key) => {
            switch (key) {
              case "total":
                navigate("/dashboard?view=clients");
                break;
              case "active":
                navigate("/dashboard?view=clients&filter=active");
                break;
              case "new":
                navigate("/academy?tab=students&dateFilter=month");
                break;
              case "stage":
                navigate("/academy?tab=students&sort=progress_desc");
                break;
              case "revenue":
                navigate("/dashboard?view=revenue");
                break;
            }
          }}
        />

        {/* Analytics */}
        <DashboardAnalytics clients={clients.map(c => ({ id: c.id, name: c.name, status: c.status, planName: c.planName }))} />

        {/* Client overview grouped by plan */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">סקירת לקוחות</h2>
            <span className="text-xs text-gray-600">({clients.length} סה"כ)</span>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 bg-white/[0.03] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : groupedByPlan.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-full bg-white/[0.03] flex items-center justify-center mb-4">
                <span className="text-4xl">👥</span>
              </div>
              <p className="text-white text-lg font-medium mb-2">אין לקוחות עדיין</p>
              <p className="text-gray-500 text-sm">הוסף את הלקוח הראשון שלך כדי להתחיל</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedByPlan.map(({ plan, planKey, clients: groupClients }) => {
                const isOpen = !collapsedPlans.has(planKey);
                const planColor = plan?.color || "#6366F1";
                const activeCount = groupClients.filter(c => c.status === "active").length;

                return (
                  <Collapsible key={planKey} open={isOpen} onOpenChange={() => togglePlan(planKey)}>
                    <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.03] transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: planColor }} />
                            <span className="text-white font-semibold text-sm">{plan?.name || "ללא מסלול"}</span>
                            <span className="text-gray-600 text-xs">{groupClients.length} לקוחות</span>
                            <span className="text-emerald-500/70 text-xs">• {activeCount} פעילים</span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`} />
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t border-white/[0.04]">
                          {groupClients.map((client, idx) => (
                            <div
                              key={client.id}
                              onClick={() => setProfileId(client.id)}
                              className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer border-b border-white/[0.03] last:border-b-0 group"
                            >
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarColors[idx % avatarColors.length]}`}>
                                {getInitials(client.name)}
                              </div>
                              <div className="flex items-center gap-2 min-w-[140px]">
                                <span className="text-white font-medium text-sm">{client.name}</span>
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusColor(client.status)}`} />
                              </div>
                              <div className="hidden sm:flex items-center gap-1.5 min-w-[120px]">
                                {client.phone ? (
                                  <button onClick={(e) => { e.stopPropagation(); copyToClipboard(client.phone, `dp-${client.id}`); }} className="flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors text-xs">
                                    <Phone className="w-3 h-3" />{client.phone}
                                    {copiedId === `dp-${client.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-50" />}
                                  </button>
                                ) : <span className="text-gray-700 text-xs">—</span>}
                              </div>
                              <div className="hidden md:flex items-center gap-1.5 min-w-[160px]">
                                {client.email ? (
                                  <button onClick={(e) => { e.stopPropagation(); copyToClipboard(client.email, `de-${client.id}`); }} className="flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors text-xs truncate">
                                    <Mail className="w-3 h-3 shrink-0" /><span className="truncate">{client.email}</span>
                                    {copiedId === `de-${client.id}` ? <Check className="w-3 h-3 text-emerald-400 shrink-0" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-50 shrink-0" />}
                                  </button>
                                ) : <span className="text-gray-700 text-xs">—</span>}
                              </div>
                              <div className="flex items-center gap-2 mr-auto">
                                <div className="w-20 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${client.totalStages > 0 ? (client.currentStage / client.totalStages) * 100 : 0}%`, backgroundColor: planColor }} />
                                </div>
                                <span className="text-[11px] text-gray-500 whitespace-nowrap">{client.currentStage}/{client.totalStages}</span>
                              </div>
                              <ChevronLeft className="w-4 h-4 text-gray-700 group-hover:text-gray-400 transition-colors shrink-0" />
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {profileId && (
        <ClientProfileDrawer
          clientId={profileId}
          onClose={() => setProfileId(null)}
          onEdit={() => {}}
          onDelete={() => { setProfileId(null); loadData(); }}
        />
      )}
    </div>
  );
}
