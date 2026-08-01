import { cn } from "@/lib/utils";
import type { BugCategory, BugEnvironment, BugSeverity, BugStatus } from "@/types/bug";
import {
  BUG_CATEGORY_LABEL,
  BUG_SEVERITY_LABEL,
  BUG_SEVERITY_TONE,
  BUG_STATUS_LABEL,
  BUG_STATUS_TONE,
  bugEnvironmentLabel,
} from "@/lib/os/bugs-ui";

const BASE =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

/** Badge de status do bug — texto + cor (nunca apenas cor). */
export function BugStatusBadge({ status, className }: { status: BugStatus; className?: string }) {
  const tone = BUG_STATUS_TONE[status] ?? BUG_STATUS_TONE.new;
  return (
    <span className={cn(BASE, tone.className, className)}>
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
      {BUG_STATUS_LABEL[status] ?? status}
    </span>
  );
}

/** Badge de severidade. */
export function BugSeverityBadge({
  severity,
  className,
}: {
  severity: BugSeverity;
  className?: string;
}) {
  return (
    <span className={cn(BASE, BUG_SEVERITY_TONE[severity] ?? BUG_SEVERITY_TONE.normal, className)}>
      {BUG_SEVERITY_LABEL[severity] ?? severity}
    </span>
  );
}

/** Badge de ambiente — com fallback "Desconhecido". */
export function BugEnvironmentBadge({
  environment,
  className,
}: {
  environment: BugEnvironment | string | null;
  className?: string;
}) {
  return (
    <span className={cn(BASE, "border-border bg-surface text-muted-foreground", className)}>
      {bugEnvironmentLabel(environment)}
    </span>
  );
}

/** Rótulo simples de categoria (sem cor própria, para colunas densas). */
export function BugCategoryLabel({ category }: { category: BugCategory }) {
  return (
    <span className="text-sm text-muted-foreground">
      {BUG_CATEGORY_LABEL[category] ?? category}
    </span>
  );
}
