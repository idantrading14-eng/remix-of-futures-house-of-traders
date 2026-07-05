import { useState } from "react";
import { testLevels } from "@/data/testsData";
import LevelsList from "./LevelsList";
import TestRunner from "./TestRunner";
import TestResults from "./TestResults";
import type { AnswerValue } from "./types";

type Stage =
  | { kind: "list" }
  | { kind: "running"; levelId: string }
  | { kind: "results"; levelId: string; answers: AnswerValue[] };

export default function TestsView() {
  const [stage, setStage] = useState<Stage>({ kind: "list" });

  if (stage.kind === "list") {
    return <LevelsList levels={testLevels} onSelect={(id) => setStage({ kind: "running", levelId: id })} />;
  }

  const level = testLevels.find(l => l.id === stage.levelId)!;

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
