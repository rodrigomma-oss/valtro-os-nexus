import { ArrowUpRight, BarChart3, Megaphone, Tag } from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
    <section id="solucoes" className="py-24 md:py-32 bg-surface border-y border-border">
      <div className="container-page">
        <div className="max-w-2xl">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-brand">
            Soluções
          </div>
          <h2 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight">
            Um ecossistema de produtos em expansão contínua.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            Cada produto Valtro é pensado para resolver uma etapa crítica da operação
            digital — do preço à performance, da mídia à análise.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {SOLUTIONS.map((s) => (
            <SolutionCard key={s.name} solution={s} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SolutionCard({ solution }: { solution: Solution }) {
  const { name, tagline, description, icon: Icon, status, href } = solution;
  const isAvailable = status === "available";

  return (
    <article
      className={`group relative flex flex-col rounded-2xl border p-6 transition-all ${
        isAvailable
          ? "border-border bg-surface-elevated shadow-soft hover:shadow-elevated hover:-translate-y-0.5"
          : "border-dashed border-border bg-transparent"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className={`grid h-11 w-11 place-items-center rounded-xl ${
            isAvailable ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            isAvailable
              ? "bg-brand-soft text-brand"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isAvailable && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
          {isAvailable ? STATUS_LABEL[status] : "Em breve"}
        </span>
      </div>

      <div className="mt-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {tagline}
        </div>
        <h3 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
          {name}
        </h3>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mt-6 pt-6 border-t border-border/70">
        {isAvailable && href ? (
          <a
            href={href}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground group/link"
          >
            Conhecer
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">
            {STATUS_LABEL[status]}
          </span>
        )}
      </div>
    </article>
  );
}
