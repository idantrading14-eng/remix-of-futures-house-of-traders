import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDivision } from "@/contexts/DivisionContext";
import ClientTimeline from "@/components/ClientTimeline";

type Profile = {
  id: string;
  display_name: string;
  role: string;
  approved: boolean;
};

type StudentForTimeline = {
  id: string;
  name: string;
  avatar: string;
};

interface TimelinePageProps {
  embedded?: boolean;
  onViewChange?: (view: string) => void;
}

const TimelinePage = ({ embedded = false, onViewChange }: TimelinePageProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [students, setStudents] = useState<StudentForTimeline[]>([]);
  const [autoOpenAddForm, setAutoOpenAddForm] = useState(searchParams.get("add") === "1");
  const { activeDivisionId } = useDivision();

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { if (!embedded) navigate("/"); return; }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "mentor") { if (!embedded) navigate("/"); return; }

    let query = supabase.from("profiles").select("*").in("role", ["student", "manual_client"]);
    if (activeDivisionId) query = query.eq("division_id", activeDivisionId);
    const { data: profiles } = await query;
    if (profiles) {
      const approved = profiles
        .filter((p: Profile) => p.role === "student" && p.approved)
        .map((p: Profile) => ({
          id: p.id,
          name: p.display_name,
          avatar: p.display_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2),
        }));
      const manuals = profiles
        .filter((p: Profile) => p.role === "manual_client")
        .map((p: Profile) => ({
          id: p.id,
          name: p.display_name,
          avatar: p.display_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2),
        }));
      setStudents([...approved, ...manuals]);
    }
  }, [navigate, embedded, activeDivisionId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleBack = () => {
    if (embedded && onViewChange) {
      onViewChange("dashboard");
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className={`${embedded ? "h-full" : "h-screen"} flex flex-col overflow-hidden`}>
      <ClientTimeline
        students={students}
        onBack={handleBack}
        onStudentsChanged={loadData}
        autoOpenAddForm={autoOpenAddForm}
        onAutoOpenConsumed={() => {
          setAutoOpenAddForm(false);
          if (!embedded) setSearchParams({}, { replace: true });
        }}
      />
    </div>
  );
};

export default TimelinePage;
