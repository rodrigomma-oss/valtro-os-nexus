import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface LegalSectionProps {
  id: string;
  title: string;
  children: ReactNode;
}

/** Seção de conteúdo legal com âncora e título consistente. */
export function LegalSection({ id, title, children }: LegalSectionProps) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-sm md:text-base leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export interface LegalNoticeProps {
  children: ReactNode;
  tone?: "info" | "warning";
  className?: string;
}

/** Caixa de observação para destacar pontos relevantes. */
export function LegalNotice({ children, tone = "info", className }: LegalNoticeProps) {
  return (
    <aside
      className={cn(
        "rounded-lg border p-4 md:p-5 text-sm leading-relaxed",
        tone === "info"
          ? "border-primary/20 bg-brand-soft text-foreground"
          : "border-border bg-surface text-foreground",
        className,
      )}
    >
      {children}
    </aside>
  );
}

export interface LegalTOCProps {
  items: { id: string; label: string }[];
}

/** Sumário lateral / topo para navegação por âncora. */
export function LegalTOC({ items }: LegalTOCProps) {
  return (
    <nav aria-label="Índice" className="rounded-lg border border-border bg-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
        Nesta página
      </p>
      <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
        {items.map((item, idx) => (
          <li key={item.id} className="flex gap-2">
            <span className="tabular-nums text-primary">{String(idx + 1).padStart(2, "0")}</span>
            <a
              href={`#${item.id}`}
              className="hover:text-primary transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export interface LegalLayoutProps {
  toc: { id: string; label: string }[];
  lastUpdated: string;
  children: ReactNode;
}

/** Layout de duas colunas (sumário + conteúdo) para páginas legais. */
export function LegalLayout({ toc, lastUpdated, children }: LegalLayoutProps) {
  return (
    <section className="container-page py-16 md:py-20">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-28 lg:self-start space-y-4">
          <LegalTOC items={toc} />
          <p className="text-xs text-muted-foreground px-1">
            Última atualização:{" "}
            <span className="font-medium text-foreground">{lastUpdated}</span>
          </p>
        </aside>
        <div className="space-y-14 max-w-3xl">{children}</div>
      </div>
    </section>
  );
}
