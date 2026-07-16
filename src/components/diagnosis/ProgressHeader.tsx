import { motion } from "framer-motion";
import { STEPS } from "./types";

interface ProgressHeaderProps {
  currentStep: number; // 0-based index within STEPS
}

export function ProgressHeader({ currentStep }: ProgressHeaderProps) {
  const total = STEPS.length;
  const pct = Math.round(((currentStep + 1) / total) * 100);
  return (
    <div className="mx-auto w-full max-w-[820px] px-6 pb-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span className="font-medium tracking-wide">
          Etapa {currentStep + 1} de {total} · {STEPS[currentStep].label}
        </span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <div className="mt-4 hidden md:flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex-1 flex items-center gap-2">
            <div
              className={`h-6 w-6 rounded-full grid place-items-center text-[10px] font-semibold border transition-colors ${
                i < currentStep
                  ? "bg-primary text-primary-foreground border-primary"
                  : i === currentStep
                  ? "bg-background text-primary border-primary"
                  : "bg-background text-muted-foreground border-border"
              }`}
            >
              {i < currentStep ? "✓" : i + 1}
            </div>
            <span className={`text-xs ${i === currentStep ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
