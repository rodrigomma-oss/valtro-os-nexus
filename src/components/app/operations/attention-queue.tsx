/**
 * Sprint 13.7 — Fila "Atenção necessária".
 *
 * Componente estritamente de apresentação: toda a derivação de pendência e
 * prioridade vem de `@/lib/attention`. Não edita entidades — apenas direciona
 * o operador para a entidade original (regra 3 da sprint).
 */
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ATTENTION_CATEGORY_LABEL,
  ATTENTION_CATEGORY_ORDER,
  ATTENTION_PRIORITY_LABEL,
  ATTENTION_PRIORITY_TONE,
  filterAttention,
  timeInSituation,
  type AttentionCategory,
  type AttentionCounts,
  type AttentionItem,
  type AttentionPriority,
} from "@/lib/attention";

export interface AttentionQueueProps {
  items: AttentionItem[];
  counts: AttentionCounts;
  isLoading?: boolean;
}

type CategoryFilter = AttentionCategory | "todos";
type PriorityFilter = AttentionPriority | "todas";

const PRIORITY_FILTERS: { value: PriorityFilter; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "critica", label: "Crítica" },
  { value: "atencao", label: "Atenção" },
  { value: "normal", label: "Normal" },
];

function Chip({
  active,
  onClick,
  children,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-muted-foreground hover:bg-muted/50",
      )}
    >
      {children}
    </button>
  );
}

export function AttentionQueue({ items, counts, isLoading }: AttentionQueueProps) {
  const [category, setCategory] = useState<CategoryFilter>("todos");
  const [priority, setPriority] = useState<PriorityFilter>("todas");

  const visible = useMemo(
    () => filterAttention(items, { category, priority }),
    [items, category, priority],
  );

  return (
    <div className="space-y-4" data-testid="attention-queue">
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={category === "todos"} onClick={() => setCategory("todos")} testId="attn-filter-todos">
          Todos
          <span className="opacity-70">{counts.total}</span>
        </Chip>
        {ATTENTION_CATEGORY_ORDER.map((c) => (
          <Chip
            key={c}
            active={category === c}
            onClick={() => setCategory(c)}
            testId={`attn-filter-${c}`}
          >
            {ATTENTION_CATEGORY_LABEL[c]}
            <span className="opacity-70">{counts.byCategory[c]}</span>
          </Chip>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />
        {PRIORITY_FILTERS.map((p) => (
          <Chip
            key={p.value}
            active={priority === p.value}
            onClick={() => setPriority(p.value)}
            testId={`attn-priority-${p.value}`}
          >
            {p.label}
          </Chip>
        ))}
      </div>

      {isLoading ? (
        <ul className="space-y-2" aria-busy>
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-[76px] animate-pulse rounded-2xl border border-border bg-muted/40" />
          ))}
        </ul>
      ) : visible.length === 0 ? (
        <div
          data-testid="attention-empty"
          className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface p-10 text-center"
        >
          <ShieldCheck className="h-6 w-6 text-success" strokeWidth={1.75} aria-hidden />
          <p className="text-sm font-medium text-foreground">Nada exige sua atenção agora</p>
          <p className="text-xs text-muted-foreground">
            Itens aparecem aqui automaticamente conforme o estado real das entidades.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
          {visible.map((it, i) => (
            <motion.li
              key={it.id}
              data-testid="attention-item"
              data-kind={it.kind}
              data-priority={it.priority}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.03, duration: 0.25 }}
            >
              <Link
                to={it.cta.to}
                params={it.cta.params as never}
                search={(it.cta.search ?? {}) as never}
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:bg-muted/40"
              >

                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                    ATTENTION_PRIORITY_TONE[it.priority],
                  )}
                >
                  {ATTENTION_PRIORITY_LABEL[it.priority]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <p className="truncate text-sm font-medium text-foreground">{it.subject}</p>
                    <span className="text-xs text-muted-foreground">
                      · {ATTENTION_CATEGORY_LABEL[it.category]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      · {timeInSituation(it.since)}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {it.label}
                    {it.detail ? ` — ${it.detail}` : ""}
                  </p>
                </div>
                <span className="hidden shrink-0 items-center gap-1 text-xs font-medium text-primary sm:inline-flex">
                  {it.cta.label}
                  <ChevronRight
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
