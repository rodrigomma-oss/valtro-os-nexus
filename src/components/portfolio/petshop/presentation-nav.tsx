import { useEffect, useState } from "react";
import { ArrowUp, ChevronDown, ChevronUp } from "lucide-react";

export interface NavStep {
  id: string;
  label: string;
}

export interface PresentationNavProps {
  steps: NavStep[];
}

/**
 * Navegação discreta para uso durante reuniões:
 * indicador de progresso, seção atual e navegação anterior/próxima.
 */
export function PresentationNav({ steps }: PresentationNavProps) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const nodes = steps
      .map((step) => document.getElementById(step.id))
      .filter((node): node is HTMLElement => node !== null);

    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = steps.findIndex((step) => step.id === visible.target.id);
        if (index >= 0) setActive(index);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [steps]);

  const goTo = (index: number) => {
    const target = steps[Math.min(Math.max(index, 0), steps.length - 1)];
    if (!target) return;
    document.getElementById(target.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const progress = ((active + 1) / steps.length) * 100;
  const current = steps[active];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50">
      <div
        className="h-0.5 w-full bg-border/60"
        role="progressbar"
        aria-label="Progresso da apresentação"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={active + 1}
      >
        <div
          className="h-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="pointer-events-auto flex items-center justify-between gap-3 border-t border-border bg-surface/90 px-4 py-2.5 backdrop-blur md:px-6">
        <div className="min-w-0">
          <span className="font-mono text-xs tabular-nums text-primary">
            {String(active + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
          </span>
          <span className="ml-3 truncate text-xs font-medium text-muted-foreground md:text-sm">
            {current?.label}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => goTo(0)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Voltar ao início da apresentação"
          >
            <ArrowUp className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            disabled={active === 0}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Seção anterior"
          >
            <ChevronUp className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => goTo(active + 1)}
            disabled={active === steps.length - 1}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Próxima seção"
          >
            <ChevronDown className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
