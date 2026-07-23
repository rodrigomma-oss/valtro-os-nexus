import { ArrowUpRight, BarChart3, Megaphone, Tag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionHeader } from "@/components/shared/section-header";

type Status = "available" | "developing" | "planning";

interface Solution {
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  status: Status;
  href?: string;
}

const SOLUTIONS: Solution[] = [
  {
    name: "Valtro Pricing",
    tagline: "Precificação inteligente",
    description:
      "Precificação estratégica e automatizada para marketplaces e e-commerces, com regras, margens e monitoramento contínuo.",
    icon: Tag,
    status: "available",
    href: "https://pricing.valtrolabs.pro",
  },
  {
    name: "Valtro Ads",
    tagline: "Gestão de mídia paga",
    description:
      "Otimização e orquestração de campanhas de mídia paga, com automações e visão unificada de performance.",
    icon: Megaphone,
    status: "developing",
  },
  {
    name: "Valtro Analytics",
    tagline: "Inteligência de dados",
    description:
      "Camada de analytics unificada para transformar dados operacionais em decisões claras e acionáveis.",
    icon: BarChart3,
    status: "planning",
  },
];

const STATUS_LABEL: Record<Status, string> = {
  available: "Disponível",
  developing: "Em desenvolvimento",
  planning: "Em planejamento",
};

export function Solutions() {
  return (
    <section
      id="solucoes"
      aria-labelledby="solucoes-title"
      className="section-y bg-surface border-y border-border"
    >
      <div className="container-page">
        <SectionHeader
          eyebrow="Soluções"
          title={
            <span id="solucoes-title">
              Um ecossistema de produtos em expansão contínua.
            </span>
          }
          description="Cada produto Valtro é pensado para resolver uma etapa crítica da operação digital — do preço à performance, da mídia à análise."
        />

        <ul className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6 not-prose">
          {SOLUTIONS.map((s) => (
            <li key={s.name} className="flex">
              <SolutionCard solution={s} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function SolutionCard({ solution }: { solution: Solution }) {
  const { name, tagline, description, icon: Icon, status, href } = solution;
  const isAvailable = status === "available";

  return (
    <article
      aria-label={`${name} — ${STATUS_LABEL[status]}`}
      className={`group relative flex w-full flex-col rounded-2xl border p-7 transition-all duration-200 ${
        isAvailable
          ? "border-border bg-background shadow-soft hover:shadow-elevated hover:border-primary/30 hover:-translate-y-0.5"
          : "border-dashed border-border bg-transparent"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className={`grid h-12 w-12 place-items-center rounded-xl transition-transform ${
            isAvailable
              ? "bg-brand-soft text-primary group-hover:scale-105"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            isAvailable ? "bg-brand-soft text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {isAvailable && (
            <span className="relative flex h-1.5 w-1.5" aria-hidden>
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary/60 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
          )}
          {isAvailable ? STATUS_LABEL[status] : "Em breve"}
        </span>
      </div>

      <div className="mt-7 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {tagline}
        </p>
        <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">
          {name}
        </h3>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mt-7 pt-6 border-t border-border">
        {isAvailable && href ? (
          <a
            href={href}
            aria-label={`Conhecer ${name}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background group/link"
          >
            Conhecer
            <ArrowUpRight
              className="h-4 w-4 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
              aria-hidden
            />
          </a>
        ) : (
          <span className="text-xs font-medium text-muted-foreground">
            {STATUS_LABEL[status]}
          </span>
        )}
      </div>
    </article>
  );
}
