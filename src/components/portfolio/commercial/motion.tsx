import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface RevealProps {
  children: ReactNode;
  className?: string;
  y?: number;
  delay?: number;
  scale?: number;
}

export function Reveal({ children, className, y = 24, delay = 0, scale = 1 }: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, scale }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay, ease: [0.2, 0.65, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

export interface SectionProps {
  id: string;
  index: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}

export function PresentationSection({ id, index, eyebrow, children, className }: SectionProps) {
  return (
    <section
      id={id}
      data-presentation-section={id}
      className={cn(
        "relative scroll-mt-24 border-t border-border/60 py-20 md:py-28",
        className,
      )}
    >
      <div className="container-page">
        {(eyebrow || index) && (
          <Reveal className="mb-8 flex items-center gap-3">
            <span className="font-mono text-xs tabular-nums text-primary">{index}</span>
            {eyebrow && (
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {eyebrow}
              </span>
            )}
          </Reveal>
        )}
        {children}
      </div>
    </section>
  );
}
