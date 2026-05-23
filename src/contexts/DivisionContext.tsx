import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Division = {
  id: string;
  name: string;
  created_at: string;
};

type DivisionContextType = {
  divisions: Division[];
  activeDivisionId: string | null;
  activeDivision: Division | null;
  setActiveDivisionId: (id: string) => void;
  loading: boolean;
};

const DivisionContext = createContext<DivisionContextType>({
  divisions: [],
  activeDivisionId: null,
  activeDivision: null,
  setActiveDivisionId: () => {},
  loading: true,
});

export function DivisionProvider({ children }: { children: ReactNode }) {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [activeDivisionId, setActiveDivisionIdState] = useState<string | null>(
    () => localStorage.getItem("activeDivisionId")
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("divisions").select("*").order("created_at");
      if (data && data.length > 0) {
        setDivisions(data);
        // If no saved division or saved one doesn't exist, default to first
        const saved = localStorage.getItem("activeDivisionId");
        if (!saved || !data.find(d => d.id === saved)) {
          setActiveDivisionIdState(data[0].id);
          localStorage.setItem("activeDivisionId", data[0].id);
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  const setActiveDivisionId = (id: string) => {
    setActiveDivisionIdState(id);
    localStorage.setItem("activeDivisionId", id);
  };

  const activeDivision = divisions.find(d => d.id === activeDivisionId) || null;

  return (
    <DivisionContext.Provider value={{ divisions, activeDivisionId, activeDivision, setActiveDivisionId, loading }}>
      {children}
    </DivisionContext.Provider>
  );
}

export function useDivision() {
  return useContext(DivisionContext);
}
