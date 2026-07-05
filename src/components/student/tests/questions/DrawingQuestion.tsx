import { useEffect, useRef, useState } from "react";
import { Pen, Eraser, Trash2, Eye } from "lucide-react";
import QuestionShell from "./QuestionShell";
import TestImage from "../TestImage";
import type { DrawingQ, AnswerValue } from "../types";

interface Props {
  question: DrawingQ;
  value: Extract<AnswerValue, { type: "drawing" }>;
  onChange: (v: Extract<AnswerValue, { type: "drawing" }>) => void;
  disabled?: boolean;
}

export default function DrawingQuestion({ question, value, onChange, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [drawing, setDrawing] = useState(false);
  const [revealed, setRevealed] = useState(value.selfGraded !== null);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  // Resize canvas to container width
  useEffect(() => {
    const c = canvasRef.current;
    const w = wrapRef.current;
    if (!c || !w) return;
    const width = w.clientWidth;
    const height = 320;
    if (c.width !== width || c.height !== height) {
      c.width = width;
      c.height = height;
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#0f0f0f";
        ctx.fillRect(0, 0, width, height);
      }
    }
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (c.width / rect.width), y: (e.clientY - rect.top) * (c.height / rect.height) };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (revealed) return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    setDrawing(true);
    lastRef.current = pos(e);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing || revealed) return;
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const p = pos(e);
    const last = lastRef.current || p;
    ctx.strokeStyle = tool === "pen" ? "#d4a017" : "#0f0f0f";
    ctx.lineWidth = tool === "pen" ? 3 : 20;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
  };
  const end = () => {
    setDrawing(false);
    lastRef.current = null;
    const c = canvasRef.current;
    if (c) onChange({ ...value, dataUrl: c.toDataURL("image/png") });
  };
  const clear = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#0f0f0f";
    ctx.fillRect(0, 0, c.width, c.height);
    onChange({ type: "drawing", dataUrl: null, selfGraded: null });
    setRevealed(false);
  };

  const reveal = () => {
    const c = canvasRef.current;
    onChange({ ...value, dataUrl: c ? c.toDataURL("image/png") : value.dataUrl });
    setRevealed(true);
  };

  const grade = (correct: boolean) => {
    onChange({ ...value, selfGraded: correct });
  };

  return (
    <QuestionShell question={question}>
      <div ref={wrapRef} className="space-y-3">
        {!revealed && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTool("pen")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs"
              style={{
                background: tool === "pen" ? "rgba(212,160,23,0.15)" : "rgba(255,255,255,0.04)",
                color: tool === "pen" ? "#d4a017" : "#aaa",
                border: `1px solid ${tool === "pen" ? "#d4a017" : "rgba(255,255,255,0.08)"}`,
              }}
            >
              <Pen className="w-3.5 h-3.5" /> עט
            </button>
            <button
              onClick={() => setTool("eraser")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs"
              style={{
                background: tool === "eraser" ? "rgba(212,160,23,0.15)" : "rgba(255,255,255,0.04)",
                color: tool === "eraser" ? "#d4a017" : "#aaa",
                border: `1px solid ${tool === "eraser" ? "#d4a017" : "rgba(255,255,255,0.08)"}`,
              }}
            >
              <Eraser className="w-3.5 h-3.5" /> מחק
            </button>
            <button
              onClick={clear}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs mr-auto"
              style={{ background: "rgba(255,255,255,0.04)", color: "#aaa", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Trash2 className="w-3.5 h-3.5" /> נקה הכל
            </button>
          </div>
        )}

        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="w-full rounded-xl touch-none"
          style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.08)", height: 320 }}
        />

        {!revealed ? (
          <button
            onClick={reveal}
            disabled={!value.dataUrl || disabled}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: "#d4a017", color: "#111" }}
          >
            <Eye className="w-4 h-4" /> בדוק תשובה
          </button>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-xs mb-2" style={{ color: "#888" }}>התשובה הנכונה:</p>
              <TestImage
                src={question.correctAnswerImage}
                alt="correct"
                className="w-full max-h-80 object-contain rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)" }}
              />
            </div>
            <p className="text-sm text-center" style={{ color: "#ddd" }}>איך הציור שלך? דרג את עצמך:</p>
            <div className="flex gap-3">
              <button
                onClick={() => grade(true)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: value.selfGraded === true ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${value.selfGraded === true ? "#22c55e" : "rgba(255,255,255,0.08)"}`,
                  color: value.selfGraded === true ? "#22c55e" : "#ddd",
                }}
              >
                עניתי נכון
              </button>
              <button
                onClick={() => grade(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: value.selfGraded === false ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${value.selfGraded === false ? "#ef4444" : "rgba(255,255,255,0.08)"}`,
                  color: value.selfGraded === false ? "#ef4444" : "#ddd",
                }}
              >
                עניתי לא נכון
              </button>
            </div>
          </div>
        )}
      </div>
    </QuestionShell>
  );
}
