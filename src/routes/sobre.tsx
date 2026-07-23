import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Compass,
  Database,
  Feather,
  Infinity as InfinityIcon,
  Layers,
  Megaphone,
  Sparkles,
  Tag,
} from "lucide-react";
import { PublicLayout } from "@/layouts/public-layout";
import { SectionHeader } from "@/components/shared/section-header";
import { FeatureCard } from "@/components/shared/feature-card";

const PAGE_TITLE = "Sobre a Valtro Labs — Tecnologia com propósito";
const PAGE_DESCRIPTION =
  "Conheça a filosofia, o propósito e a visão da Valtro Labs: uma empresa brasileira que desenvolve soluções para simplificar decisões e impulsionar negócios digitais.";
const PAGE_URL = "https://valtrolabs.pro/sobre";

export const Route = createFileRoute("/sobre")({
  component: SobrePage,
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: PAGE_TITLE },
      { name: "twitter:description", content: PAGE_DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: PAGE_TITLE,
          url: PAGE_URL,
          description: PAGE_DESCRIPTION,
          mainEntity: {
            "@type": "Organization",
            name: "Valtro Labs",
            url: "https://valtrolabs.pro",
            sameAs: ["https://instagram.com/valtro.labs"],
          },
        }),
      },
    ],
  }),
});

const PURPOSE_POINTS = [
  "Negócios digitais estão cada vez mais complexos, com dados espalhados e decisões urgentes.",
  "A maioria das ferramentas aumenta essa complexidade em vez de resolvê-la.",
  "Nossa missão é simplificar processos sem abrir mão de profundidade técnica.",
  "Construímos tecnologia proprietária, modular e brasileira, feita para evoluir junto com cada negócio.",
] as const;

const PRINCIPLES = [
  {
    icon: Compass,
    title: "Clareza acima da complexidade",
    text: "Reduzimos ruído. Cada tela, número e regra existe para orientar uma decisão melhor.",
  },
  {
    icon: Feather,
    title: "Tecnologia para pessoas",
    text: "Produtos que qualquer time consegue usar — sem manuais extensos e sem fricção operacional.",
  },
  {
    icon: Database,
    title: "Decisões orientadas por dados",
    text: "Transformamos dados operacionais em respostas objetivas para o dia a dia comercial.",
  },
  {
    icon: InfinityIcon,
    title: "Evolução contínua",
    text: "Nossas soluções amadurecem junto com o cliente e com o mercado — sem grandes rupturas.",
  },
  {
    icon: Layers,
    title: "Arquitetura escalável",
    text: "Fundamentos técnicos sólidos para sustentar cada nova solução do ecossistema.",
  },
] as const;

type EcosystemStatus = "available" | "developing" | "planning" | "future";

const ECOSYSTEM: Array<{
  name: string;
  status: EcosystemStatus;
  description: string;
  icon: typeof Tag;
}> = [
  {
    name: "Valtro Pricing",
    status: "available",
    description:
      "Precificação inteligente para marketplaces e e-commerces. Primeira solução do ecossistema.",
    icon: Tag,
  },
  {
    name: "Valtro Ads",
    status: "developing",
    description:
      "Gestão e orquestração de mídia paga, com automações e visão unificada de performance.",
    icon: Megaphone,
  },
  {
    name: "Valtro Analytics",
    status: "planning",
    description:
      "Camada de dados que unifica operação e estratégia em uma leitura só.",
    icon: BarChart3,
  },
  {
    name: "Novas soluções",
    status: "future",
    description:
      "Novos módulos serão desenvolvidos à medida que os negócios digitais evoluem.",
    icon: Sparkles,
  },
];

const STATUS_LABEL: Record<EcosystemStatus, string> = {
  available: "Disponível",
  developing: "Em desenvolvimento",
  planning: "Em planejamento",
  future: "Em construção",
};

function SobrePage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section
        aria-labelledby="sobre-hero-title"
        className="relative overflow-hidden pt-36 pb-20 md:pt-44 md:pb-28"
      >
        <div className="absolute inset-0 bg-gradient-hero pointer-events-none" aria-hidden />
        <div
          className="absolute inset-0 bg-grid-subtle opacity-70 [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_70%)] pointer-events-none"
          aria-hidden
        />
        <div className="container-page relative">
          <div className="max-w-3xl animate-fade-up">
            <p className="eyebrow">Sobre a Valtro Labs</p>
            <h1
              id="sobre-hero-title"
              className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05] text-foreground text-balance"
            >
              Tecnologia com propósito.{" "}
              <span className="text-primary">Soluções que simplificam decisões.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl leading-relaxed">
              A Valtro Labs desenvolve soluções para transformar processos
              complexos em experiências simples, eficientes e escaláveis — construindo,
              a cada produto, um ecossistema modular pensado para negócios digitais.
            </p>
          </div>
        </div>
      </section>

      {/* Por que existimos */}
      <section aria-labelledby="proposito-title" className="section-y">
        <div className="container-page">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            <div className="lg:col-span-5">
              <p className="eyebrow">Por que existimos</p>
              <h2
                id="proposito-title"
                className="mt-4 text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight text-foreground text-balance"
              >
                Simplificar sem abrir mão de profundidade.
              </h2>
              <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed">
                Existimos para resolver um problema silencioso: quanto mais um negócio
                digital cresce, mais decisões críticas passam a depender de tecnologia.
                A Valtro Labs nasce para preencher esse espaço com engenharia,
                dados e design.
              </p>
            </div>
            <div className="lg:col-span-7">
              <ul className="grid sm:grid-cols-2 gap-3 not-prose">
                {PURPOSE_POINTS.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-4 shadow-soft transition-colors hover:border-primary/30"
                  >
                    <CheckCircle2
                      className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <span className="text-sm text-foreground leading-relaxed">
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Nossa forma de construir */}
      <section
        aria-labelledby="principios-title"
        className="section-y bg-surface border-y border-border"
      >
        <div className="container-page">
          <SectionHeader
            eyebrow="Nossa forma de construir"
            title={
              <span id="principios-title">
                Princípios que orientam cada produto.
              </span>
            }
            description="Cinco pilares que se aplicam a todas as soluções do ecossistema Valtro Labs — do primeiro protótipo até a operação em produção."
          />
          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {PRINCIPLES.map(({ icon, title, text }) => (
              <FeatureCard key={title} icon={icon} title={title} description={text} />
            ))}
          </div>
        </div>
      </section>

      {/* Ecossistema Valtro */}
      <section aria-labelledby="ecossistema-title" className="section-y">
        <div className="container-page">
          <SectionHeader
            eyebrow="O ecossistema Valtro"
            title={
              <span id="ecossistema-title">
                Um plano único, construído um produto por vez.
              </span>
            }
            description="Cada solução resolve um problema específico e conecta-se às demais, formando uma base contínua de tecnologia para negócios digitais."
          />

          <ol className="mt-16 relative grid gap-5 md:gap-6 max-w-3xl mx-auto not-prose">
            <span
              aria-hidden
              className="absolute left-6 top-3 bottom-3 w-px bg-border md:left-6"
            />
            {ECOSYSTEM.map((item, index) => {
              const Icon = item.icon;
              const isAvailable = item.status === "available";
              return (
                <li
                  key={item.name}
                  className="relative flex items-start gap-5 rounded-2xl border border-border bg-background p-6 shadow-soft"
                >
                  <div
                    className={`relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
                      isAvailable
                        ? "bg-brand-soft text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-foreground/40">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h3 className="text-lg font-semibold tracking-tight text-foreground">
                        {item.name}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          isAvailable
                            ? "bg-brand-soft text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isAvailable && (
                          <span className="relative flex h-1.5 w-1.5" aria-hidden>
                            <span className="absolute inline-flex h-full w-full rounded-full bg-primary/60 animate-ping" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                          </span>
                        )}
                        {STATUS_LABEL[item.status]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Nossa visão */}
      <section
        aria-labelledby="visao-title"
        className="section-y bg-surface border-y border-border"
      >
        <div className="container-page">
          <div className="max-w-3xl">
            <p className="eyebrow">Nossa visão</p>
            <h2
              id="visao-title"
              className="mt-4 text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight text-foreground text-balance"
            >
              Construir o ecossistema que simplifica o crescimento dos negócios digitais.
            </h2>
            <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed">
              Acreditamos em um futuro em que gestão, operação e estratégia
              conversem em uma linguagem só. Estamos construindo, produto a
              produto, uma base de tecnologia própria capaz de sustentar
              decisões mais rápidas, mais claras e mais escaláveis — para
              qualquer negócio digital que queira crescer com consistência.
            </p>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section aria-labelledby="sobre-cta-title" className="py-20 md:py-28">
        <div className="container-page">
          <div
            className="relative overflow-hidden rounded-3xl px-6 py-16 md:px-16 md:py-24 text-center shadow-elevated"
            style={{
              background:
                "linear-gradient(135deg, var(--brand-deep) 0%, var(--primary-hover) 60%, var(--primary) 100%)",
            }}
          >
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
                backgroundSize: "48px 48px",
                maskImage:
                  "radial-gradient(ellipse at center, black 20%, transparent 70%)",
              }}
              aria-hidden
            />
            <div className="relative max-w-3xl mx-auto">
              <h2
                id="sobre-cta-title"
                className="text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05] text-white text-balance"
              >
                Conheça a primeira solução do ecossistema Valtro Labs.
              </h2>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="https://pricing.valtrolabs.pro"
                  className="group inline-flex items-center gap-2 rounded-lg bg-white text-brand-deep px-6 py-3.5 text-sm font-semibold hover:bg-white/95 transition-all duration-200 shadow-elevated hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                >
                  Conhecer o Valtro Pricing
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
