import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type PipelineTone = "primary" | "warning" | "success" | "info";

export interface PipelineStage {
  id: string;
  label: string;
  count: number;
  tone: PipelineTone;
  hint: string;
}

const toneBar: Record<PipelineTone, string> = {
  primary: "bg-primary",
  warning: "bg-warning",
  success: "bg-success",
  info: "bg-info",
};

interface PipelineColumnProps {
  stage: PipelineStage;
  onClick?: () => void;
  index?: number;
  isLast?: boolean;
}

export function PipelineColumn({ stage, onClick, index = 0, isLast }: PipelineColumnProps) {
  return (
    <div className="flex items-stretch gap-2 min-w-0">
      <motion.button
        type="button"
        onClick={onClick}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06, duration: 0.35 }}
        whileHover={{ y: -2 }}
        className="group flex-1 min-w-0 text-left rounded-xl border border-border bg-surface p-4 shadow-soft transition-shadow hover:shadow-md hover:border-primary/30"
      >
        <div className={cn("h-1 w-8 rounded-full mb-3", toneBar[stage.tone])} />
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {stage.label}
          </span>
        </div>
        <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums">{stage.count}</div>
        <p className="mt-1 text-[11px] text-muted-foreground leading-snug line-clamp-2">{stage.hint}</p>
      </motion.button>
      {!isLast && (
        <div className="hidden lg:flex items-center text-muted-foreground/60">
          <ChevronRight className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

interface PipelineBoardProps {
  stages: PipelineStage[];
  onStageClick?: (id: string) => void;
}

export function PipelineBoard({ stages, onStageClick }: PipelineBoardProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 lg:flex lg:items-stretch gap-3">
      {stages.map((s, i) => (
        <div key={s.id} className="lg:flex-1 min-w-0">
          <PipelineColumn stage={s} onClick={() => onStageClick?.(s.id)} index={i} isLast={i === stages.length - 1} />
        </div>
      ))}
    </div>
  );
}
