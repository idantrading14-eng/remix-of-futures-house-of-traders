import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { testLevels as seedLevels } from "@/data/testsData";
import LevelsList from "./LevelsList";
import TestRunner from "./TestRunner";
import TestResults from "./TestResults";
import type { AnswerValue, Level, Question } from "./types";

type Stage =
  | { kind: "list" }
  | { kind: "running"; levelId: string }
  | { kind: "results"; levelId: string; answers: AnswerValue[] };

export default function TestsView() {
  const [stage, setStage] = useState<Stage>({ kind: "list" });
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("test_levels")
        .select("id, title, questions")
        .order("sort_order", { ascending: true });
      if (data && data.length > 0) {
        setLevels(data.map(r => ({
          id: r.id as string,
          title: r.title as string,
          questions: (r.questions as unknown as Question[]) || [],
        })));
      } else {
        setLevels(seedLevels);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-10 text-center" style={{ color: "#888" }}>טוען מבחנים...</div>
    );
  }

  if (stage.kind === "list") {
    return <LevelsList levels={levels} onSelect={(id) => setStage({ kind: "running", levelId: id })} />;
  }

  const level = levels.find(l => l.id === stage.levelId)!;
  if (!level) {
    setStage({ kind: "list" });
    return null;
  }

  if (stage.kind === "running") {
    return (
      <TestRunner
        level={level}
        onFinish={(answers) => setStage({ kind: "results", levelId: level.id, answers })}
        onBack={() => setStage({ kind: "list" })}
      />
    );
  }

  return (
    <TestResults
      level={level}
      answers={stage.answers}
      onRetake={() => setStage({ kind: "running", levelId: level.id })}
      onBack={() => setStage({ kind: "list" })}
    />
  );
}
