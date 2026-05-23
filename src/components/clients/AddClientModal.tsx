import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDivision, type Division } from "@/contexts/DivisionContext";

type Plan = { id: string; name: string; color: string; total_stages: number; stage_names: string[] };

type Props = {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  editClient?: {
    id: string;
    name: string;
    phone: string;
    email: string;
    planId: string;
    stage: number;
    notes: string;
    status: string;
  } | null;
};

export default function AddClientModal({ open, onClose, onAdded, editClient }: Props) {
  const { divisions, activeDivisionId } = useDivision();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [planId, setPlanId] = useState("");
  const [stage, setStage] = useState("0");
  const [notes, setNotes] = useState("");
  const [divisionId, setDivisionId] = useState(activeDivisionId || "");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      supabase.from("plans").select("*").then(({ data }) => {
        if (data) setPlans(data.map((p: any) => ({ ...p, stage_names: Array.isArray(p.stage_names) ? p.stage_names : [] })));
      });
      if (editClient) {
        setName(editClient.name);
        setPhone(editClient.phone);
        setEmail(editClient.email);
        setPlanId(editClient.planId);
        setStage(editClient.stage.toString());
        setNotes(editClient.notes);
      } else {
        setName(""); setPhone(""); setEmail(""); setPlanId(""); setStage("0"); setNotes("");
        setDivisionId(activeDivisionId || "");
      }
      setErrors({});
    }
  }, [open, editClient]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "שם הוא שדה חובה";
    if (name.trim().length > 100) e.name = "שם חייב להיות עד 100 תווים";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "אימייל לא תקין";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      if (editClient) {
        // Update existing
        await supabase.from("profiles").update({ display_name: name.trim() }).eq("id", editClient.id);
        await supabase.from("client_details").upsert({
          student_id: editClient.id,
          phone: phone.trim(),
          email: email.trim(),
          plan_id: planId || null,
          notes: notes.trim(),
          status: editClient.status,
        } as any, { onConflict: "student_id" });
        await supabase.from("student_stages").upsert({
          student_id: editClient.id,
          stage: parseInt(stage),
        } as any, { onConflict: "student_id" });
        // Log activity
        await supabase.from("activity_log" as any).insert({
          client_id: editClient.id,
          action: "update",
          description: `פרופיל עודכן`,
        });
        toast.success("לקוח עודכן בהצלחה!");
      } else {
        // Create new manual client
        const newId = crypto.randomUUID();
        const { error } = await supabase.from("profiles").insert({
          id: newId,
          display_name: name.trim(),
          role: "manual_client",
          approved: true,
          division_id: divisionId || null,
        } as any);
        if (error) throw error;

        await supabase.from("client_details").insert({
          student_id: newId,
          phone: phone.trim(),
          email: email.trim(),
          plan_id: planId || null,
          notes: notes.trim(),
          status: "active",
        } as any);

        if (parseInt(stage) > 0) {
          await supabase.from("student_stages").insert({
            student_id: newId,
            stage: parseInt(stage),
          });
        }

        // Log activity
        await supabase.from("activity_log" as any).insert({
          client_id: newId,
          action: "created",
          description: `לקוח חדש נוסף: ${name.trim()}`,
        });

        toast.success("לקוח נוסף בהצלחה!");
      }

      onAdded();
      onClose();
    } catch (err) {
      toast.error("שגיאה בשמירת הלקוח");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find(p => p.id === planId);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-md sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{editClient ? "עריכת לקוח" : "לקוח חדש"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Division selector - only show when creating new client */}
          {!editClient && divisions.length > 1 && (
            <div>
              <Label className="text-gray-400 text-xs">חטיבה *</Label>
              <Select value={divisionId} onValueChange={setDivisionId}>
                <SelectTrigger className="bg-white/[0.04] border-white/10 text-white mt-1 rounded-xl">
                  <SelectValue placeholder="בחר חטיבה" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                  {divisions.map(d => (
                    <SelectItem key={d.id} value={d.id} className="hover:bg-white/[0.06]">
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-gray-400 text-xs">שם מלא *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="הכנס שם מלא"
              className="bg-white/[0.04] border-white/10 text-white mt-1 rounded-xl focus:border-indigo-500"
              maxLength={100}
            />
            {errors.name && <p className="text-rose-400 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label className="text-gray-400 text-xs">טלפון</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="050-0000000"
              className="bg-white/[0.04] border-white/10 text-white mt-1 rounded-xl focus:border-indigo-500"
              dir="ltr"
            />
          </div>

          <div>
            <Label className="text-gray-400 text-xs">אימייל</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="bg-white/[0.04] border-white/10 text-white mt-1 rounded-xl focus:border-indigo-500"
              dir="ltr"
            />
            {errors.email && <p className="text-rose-400 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <Label className="text-gray-400 text-xs">בחירת מסלול</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger className="bg-white/[0.04] border-white/10 text-white mt-1 rounded-xl">
                <SelectValue placeholder="בחר מסלול" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                {plans.map(p => (
                  <SelectItem key={p.id} value={p.id} className="hover:bg-white/[0.06]">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-400 text-xs">שלב התחלתי</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="bg-white/[0.04] border-white/10 text-white mt-1 rounded-xl">
                <SelectValue placeholder="בחר שלב" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                {selectedPlan ? (
                  selectedPlan.stage_names.map((s, i) => (
                    <SelectItem key={i} value={i.toString()} className="hover:bg-white/[0.06]">
                      שלב {i + 1} — {s}
                    </SelectItem>
                  ))
                ) : (
                  Array.from({ length: 10 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()} className="hover:bg-white/[0.06]">
                      שלב {i + 1}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-400 text-xs">הערות</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות נוספות..."
              className="bg-white/[0.04] border-white/10 text-white mt-1 rounded-xl resize-none h-20 focus:border-indigo-500"
              maxLength={1000}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
            >
              {loading ? "שומר..." : editClient ? "עדכן לקוח" : "הוסף לקוח"}
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              className="text-gray-400 hover:text-white hover:bg-white/[0.06] rounded-xl"
            >
              ביטול
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
