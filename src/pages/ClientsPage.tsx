import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDivision } from "@/contexts/DivisionContext";
import {
  Search, Plus, ChevronDown, ChevronLeft, Copy, Check, Phone, Mail,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { type ClientRow } from "@/components/clients/ClientsTable";
import ClientProfileDrawer from "@/components/clients/ClientProfileDrawer";
import AddClientModal from "@/components/clients/AddClientModal";

type Plan = { id: string; name: string; color: string; total_stages: number; stage_names: string[] };

interface ClientsPageProps {
  embedded?: boolean;
  onViewChange?: (view: string) => void;
  initialFilter?: string;
}

export default function ClientsPage({ embedded = false, onViewChange, initialFilter }: ClientsPageProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { activeDivisionId } = useDivision();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState(initialFilter || "all");
  const [sortBy, setSortBy] = useState("name");

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const [profileId, setProfileId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<any>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [collapsedPlans, setCollapsedPlans] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { if (!embedded) navigate("/"); return; }

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (profile?.role !== "mentor") { if (!embedded) navigate("/"); return; }

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
    const { data: onboardingData } = await supabase.from("onboarding_answers").select("user_id, time_vs_money").in("user_id", ids) as any;

    const detailsMap = new Map((details || []).map((d: any) => [d.student_id, d]));
    const stagesMap = new Map((stages || []).map((s: any) => [s.student_id, s]));
    const onboardingMap = new Map((onboardingData || []).map((o: any) => [o.user_id, o.time_vs_money]));

    const rows: ClientRow[] = profiles.map(p => {
      const d = detailsMap.get(p.id) as any;
      const s = stagesMap.get(p.id) as any;
      const plan = d?.plan_id ? plansMap.get(d.plan_id) : undefined;

      return {
        id: p.id,
        name: p.display_name,
        phone: d?.phone || "",
        email: d?.email || "",
        planName: plan?.name || "",
        planColor: plan?.color || "#6366F1",
        planId: d?.plan_id || "",
        currentStage: s?.stage || 0,
        totalStages: plan?.total_stages || 8,
        stageName: plan?.stage_names?.[s?.stage || 0] || `שלב ${(s?.stage || 0) + 1}`,
        status: d?.status || "active",
        joinedAt: p.created_at || "",
        onboardingAnswer: (onboardingMap.get(p.id) as string) || "",
      };
    });

    setClients(rows);
    setLoading(false);
  }, [navigate, embedded, activeDivisionId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("clients-search")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let result = [...clients];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") {
      result = result.filter(c => c.status === filterStatus);
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case "name": return a.name.localeCompare(b.name, "he");
        case "date": return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
        case "stage": return b.currentStage - a.currentStage;
        default: return 0;
      }
    });
    return result;
  }, [clients, search, filterStatus, sortBy]);

  // Group by plan
  const groupedByPlan = useMemo(() => {
    const groups: { plan: Plan | null; planKey: string; clients: ClientRow[] }[] = [];
    const planMap = new Map<string, ClientRow[]>();
    const noPlan: ClientRow[] = [];

    for (const c of filtered) {
      const key = (c as any).planId || "";
      if (!key) {
        noPlan.push(c);
      } else {
        if (!planMap.has(key)) planMap.set(key, []);
        planMap.get(key)!.push(c);
      }
    }

    // Plans in order
    for (const plan of plans) {
      const cls = planMap.get(plan.id);
      if (cls && cls.length > 0) {
        groups.push({ plan, planKey: plan.id, clients: cls });
      }
    }

    if (noPlan.length > 0) {
      groups.push({ plan: null, planKey: "__none__", clients: noPlan });
    }

    return groups;
  }, [filtered, plans]);

  const togglePlan = (planKey: string) => {
    setCollapsedPlans(prev => {
      const next = new Set(prev);
      if (next.has(planKey)) next.delete(planKey);
      else next.add(planKey);
      return next;
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("הועתק!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    const client = clients.find(c => c.id === id);
    if (!confirm(`למחוק את ${client?.name || "הלקוח"}?`)) return;
    try {
      await supabase.from("activity_log" as any).delete().eq("client_id", id);
      await supabase.from("payments" as any).delete().eq("client_id", id);
      await supabase.from("ai_suggestions").delete().eq("student_id", id);
      await supabase.from("messages").delete().eq("student_id", id);
      await supabase.from("client_notes").delete().eq("student_id", id);
      await supabase.from("client_details").delete().eq("student_id", id);
      await supabase.from("student_stages").delete().eq("student_id", id);
      await supabase.from("profiles").delete().eq("id", id);
      toast.success("לקוח נמחק בהצלחה");
      if (profileId === id) setProfileId(null);
      loadData();
    } catch {
      toast.error("שגיאה במחיקת לקוח");
    }
  };

  const handleEdit = (id: string) => {
    const c = clients.find(cl => cl.id === id);
    if (!c) return;
    const plan = plans.find(p => p.name === c.planName);
    setEditClient({
      id: c.id, name: c.name, phone: c.phone, email: c.email,
      planId: plan?.id || "", stage: c.currentStage, notes: "", status: c.status,
    });
    setAddModalOpen(true);
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
    "bg-indigo-500/20 text-indigo-300",
    "bg-emerald-500/20 text-emerald-300",
    "bg-amber-500/20 text-amber-300",
    "bg-rose-500/20 text-rose-300",
    "bg-violet-500/20 text-violet-300",
    "bg-cyan-500/20 text-cyan-300",
  ];

  const content = (
    <div className={`${embedded ? "h-full overflow-y-auto" : ""}`}>
      <div className="max-w-[1400px] mx-auto p-6 space-y-5">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">לקוחות</h1>
            <p className="text-sm text-gray-500 mt-0.5">ניהול ומעקב אחר כל הלקוחות שלך</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              id="clients-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם, טלפון או אימייל... (Ctrl+K)"
              className="bg-white/[0.04] border-white/[0.06] text-white pr-10 rounded-xl placeholder:text-gray-600 focus:border-indigo-500/50"
            />
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32 bg-white/[0.04] border-white/[0.06] text-gray-300 rounded-xl text-xs">
              <SelectValue placeholder="סטטוס" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
              <SelectItem value="all">הכל</SelectItem>
              <SelectItem value="active">פעיל</SelectItem>
              <SelectItem value="pending">ממתין</SelectItem>
              <SelectItem value="inactive">לא פעיל</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32 bg-white/[0.04] border-white/[0.06] text-gray-300 rounded-xl text-xs">
              <SelectValue placeholder="מיון" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
              <SelectItem value="name">שם</SelectItem>
              <SelectItem value="date">תאריך</SelectItem>
              <SelectItem value="stage">שלב</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => { setEditClient(null); setAddModalOpen(true); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2"
          >
            <Plus className="w-4 h-4" />
            לקוח חדש
          </Button>
        </div>

        {/* Grouped by plan */}
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

              return (
                <Collapsible key={planKey} open={isOpen} onOpenChange={() => togglePlan(planKey)}>
                  <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden">
                    {/* Plan header */}
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.03] transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: planColor }}
                          />
                          <span className="text-white font-semibold text-sm">
                            {plan?.name || "ללא מסלול"}
                          </span>
                          <span className="text-gray-600 text-xs">
                            {groupClients.length} לקוחות
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`}
                        />
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
                            {/* Avatar */}
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarColors[idx % avatarColors.length]}`}>
                              {getInitials(client.name)}
                            </div>

                            {/* Name + status */}
                            <div className="flex items-center gap-2 min-w-[140px]">
                              <span className="text-white font-medium text-sm">{client.name}</span>
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusColor(client.status)}`} />
                            </div>

                            {/* Phone */}
                            <div className="hidden sm:flex items-center gap-1.5 min-w-[120px]">
                              {client.phone ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); copyToClipboard(client.phone, `p-${client.id}`); }}
                                  className="flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors text-xs"
                                >
                                  <Phone className="w-3 h-3" />
                                  {client.phone}
                                  {copiedId === `p-${client.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-50" />}
                                </button>
                              ) : (
                                <span className="text-gray-700 text-xs">—</span>
                              )}
                            </div>

                            {/* Email */}
                            <div className="hidden md:flex items-center gap-1.5 min-w-[160px]">
                              {client.email ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); copyToClipboard(client.email, `e-${client.id}`); }}
                                  className="flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors text-xs truncate"
                                >
                                  <Mail className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{client.email}</span>
                                  {copiedId === `e-${client.id}` ? <Check className="w-3 h-3 text-emerald-400 shrink-0" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-50 shrink-0" />}
                                </button>
                              ) : (
                                <span className="text-gray-700 text-xs">—</span>
                              )}
                            </div>

                            {/* Progress */}
                            <div className="flex items-center gap-2 mr-auto">
                              <div className="w-20 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${client.totalStages > 0 ? (client.currentStage / client.totalStages) * 100 : 0}%`,
                                    backgroundColor: planColor,
                                  }}
                                />
                              </div>
                              <span className="text-[11px] text-gray-500 whitespace-nowrap">
                                {client.currentStage}/{client.totalStages}
                              </span>
                            </div>

                            {/* Arrow */}
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

      {/* Profile drawer */}
      {profileId && (
        <ClientProfileDrawer
          clientId={profileId}
          onClose={() => setProfileId(null)}
          onEdit={handleEdit}
          onDelete={() => { setProfileId(null); loadData(); }}
        />
      )}

      {/* Add/Edit modal */}
      <AddClientModal
        open={addModalOpen}
        onClose={() => { setAddModalOpen(false); setEditClient(null); }}
        onAdded={loadData}
        editClient={editClient}
      />
    </div>
  );

  if (embedded) return content;

  return (
    <div className="h-screen flex bg-[#0A0A0F] text-white overflow-hidden" dir="rtl">
      {content}
    </div>
  );
}
