import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  userId: string;
  displayName: string;
  email: string;
  onComplete: () => void;
};

const questions = [
  {
    title: "ספר לי קצת על עצמך",
    question: "מה מתאר אותך יותר?",
    key: "time_vs_money",
    options: [
      { value: "more_time", label: "יש לי הרבה זמן, אין לי הרבה כסף", emoji: "⏰" },
      { value: "more_money", label: "יש לי כסף, אין לי הרבה זמן", emoji: "💰" },
    ],
  },
];

export default function OnboardingPopup({ userId, displayName, email, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [completing, setCompleting] = useState(false);

  const currentQuestion = questions[step];
  const isLastQuestion = step === questions.length - 1;

  const handleAnswer = async (value: string) => {
    const newAnswers = { ...answers, [currentQuestion.key]: value };
    setAnswers(newAnswers);

    if (isLastQuestion) {
      setCompleting(true);

      await supabase.from("onboarding_answers").insert({
        user_id: userId,
        user_name: displayName,
        email,
        time_vs_money: newAnswers.time_vs_money,
      } as any);

      await supabase
        .from("profiles")
        .update({ onboarding_completed: true } as any)
        .eq("id", userId);

      setTimeout(() => {
        onComplete();
      }, 1500);
    } else {
      setTimeout(() => setStep(step + 1), 300);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      {/* Card */}
      <AnimatePresence mode="wait">
        {completing ? (
          <motion.div
            key="completing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 bg-[#1e1e2e] rounded-2xl p-10 max-w-md w-full mx-4 text-center shadow-2xl border border-white/10"
          >
            <div className="text-5xl mb-4">✨</div>
            <h2 className="text-xl font-bold text-white mb-2">תודה!</h2>
            <p className="text-gray-400">מתאים לך את החוויה...</p>
            <div className="mt-6 flex justify-center">
              <div className="w-8 h-8 border-2 border-t-transparent border-indigo-500 rounded-full animate-spin" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`step-${step}`}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 bg-[#1e1e2e] rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl border border-white/10"
          >
            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-6">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i === step ? "bg-indigo-500" : i < step ? "bg-indigo-500/40" : "bg-white/10"
                  }`}
                />
              ))}
            </div>

            <h2 className="text-2xl font-bold text-white mb-1 text-center">
              {currentQuestion.title}
            </h2>
            <p className="text-gray-400 text-center mb-8">
              {currentQuestion.question}
            </p>

            <div className="space-y-3">
              {currentQuestion.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleAnswer(opt.value)}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all text-right group"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">
                    {opt.emoji}
                  </span>
                  <span className="text-white font-medium text-sm">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
