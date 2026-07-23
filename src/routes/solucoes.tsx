import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Compass,
  Layers,
  Megaphone,
  Sparkles,
  Store,
  Tag,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PublicLayout } from "@/layouts/public-layout";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionHeader } from "@/components/shared/section-header";
import { FeatureCard } from "@/components/shared/feature-card";

export const Route = createFileRoute("/solucoes")({
  component: SolucoesPage,
  head: () => ({
    meta: [
      { title: "Ecossistema de Soluções | Valtro Labs" },
      {
        name: "description",
        content:
          "Conheça o ecossistema de soluções da Valtro Labs e descubra como nossos produtos ajudam negócios digitais a crescer com mais inteligência e eficiência.",
      },
      { property: "og:title", content: "Ecossistema de Soluções | Valtro Labs" },
      {
        property: "og:description",
        content:
          "Conheça o ecossistema de soluções da Valtro Labs e descubra como nossos produtos ajudam negócios digitais a crescer com mais inteligência e eficiência.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://valtrolabs.pro/solucoes" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Ecossistema de Soluções | Valtro Labs" },
      {
        name: "twitter:description",
        content:
          "Conheça o ecossistema de soluções da Valtro Labs e descubra como nossos produtos ajudam negócios digitais a crescer.",
      },
    ],
    links: [{ rel: "canonical", href: "https://valtrolabs.pro/solucoes" }],
  }),
});

type ProductStatus = "available" | "developing" | "planning";

interface EcosystemProduct {
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  status: ProductStatus;
  href?: string;
  order: string;
}

const PRODUCTS: EcosystemProduct[] = [
  {
    name: "Valtro Pricing",
    tagline: "Precificação inteligente",
    description:
      "Calculadora inteligente para precificação em marketplaces — com regras, margens e monitoramento contínuo.",
    icon: Tag,
    status: "available",
    href: "https://pricing.valtrolabs.pro",
    order: "01",
  },
  {
    name: "Valtro Ads",
    tagline: "Mídia paga",
    description:
      "Ferramentas para análise e otimização de campanhas patrocinadas, com visão unificada de performance.",
    icon: Megaphone,
    status: "developing",
    order: "02",
  },
  {
    name: "Valtro Analytics",
    tagline: "Inteligência de dados",
    description:
      "Indicadores e inteligência para acompanhar a evolução do negócio e transformar dados em decisões claras.",
    icon: BarChart3,
    status: "planning",
    order: "03",
  },
];

const STATUS_LABEL: Record<ProductStatus, string> = {
  available: "Disponível",
  developing: "Em desenvolvimento",
  planning: "Planejado",
};

const FLOW_STEPS: { label: string; description: string; icon: LucideIcon }[] = [
  {
    label: "Sua loja",
    description: "O ponto de partida — operação e catálogo em marketplaces.",
    icon: Store,
  },
  {
    label: "Valtro Pricing",
    description: "Precificação estratégica com margens saudáveis.",
    icon: Tag,
  },
  {
    label: "Valtro Ads",
    description: "Campanhas otimizadas para acelerar vendas.",
    icon: Megaphone,
  },
  {
    label: "Valtro Analytics",
    description: "Visão consolidada para decidir com clareza.",
    icon: BarChart3,
  },
  {
    label: "Crescimento contínuo",
    description: "Um ciclo virtuoso de eficiência e escala.",
    icon: TrendingUp,
  },
];

const ROADMAP: {
  status: ProductStatus | "future";
  emoji: string;
  title: string;
  description: string;
}[] = [
  {
    status: "available",
    emoji: "✅",
    title: "Valtro Pricing",
    description: "Disponível — em uso por vendedores de marketplaces.",
  },
  {
    status: "developing",
    emoji: "🚧",
    title: "Valtro Ads",
    description: "Em desenvolvimento — expansão da camada de aquisição.",
  },
  {
    status: "planning",
    emoji: "📋",
    title: "Valtro Analytics",
    description: "Planejado — inteligência unificada do negócio.",
  },
  {
    status: "future",
    emoji: "💡",
    title: "Novas soluções",
    description: "Novos produtos serão adicionados conforme o ecossistema evolui.",
  },
];

function SolucoesPage() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="Ecossistema"
        title={
          <>
            Um ecossistema para impulsionar{" "}
            <span className="text-primary">negócios digitais</span>.
          </>
        }
        subtitle="Desenvolvemos soluções que ajudam empreendedores a tomar decisões melhores, automatizar processos e crescer com mais eficiência. O Valtro Pricing é o primeiro passo dessa jornada."
        breadcrumb={[{ label: "Home", to: "/" }, { label: "Soluções" }]}
        cta={{ label: "Conheça o Valtro Pricing", href: "https://pricing.valtrolabs.pro" }}
        secondaryCta={{ label: "Fale conosco", href: "/#contato" }}
      />

      {/* 2. Nossa visão */}
      <section aria-labelledby="visao-title" className="section-y">
        <div className="container-page">
          <SectionHeader
            eyebrow="Nossa visão"
            title={
              <span id="visao-title">
                Produtos complementares, um mesmo propósito.
              </span>
            }
            description="A Valtro Labs constrói soluções que atuam de forma integrada. Cada produto resolve um problema específico, mas todos compartilham o mesmo objetivo: simplificar a gestão e aumentar a competitividade dos negócios digitais."
          />

          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Layers}
              title="Modular"
              description="Cada solução funciona por si só e ganha força quando combinada com as demais."
            />
            <FeatureCard
              icon={Compass}
              title="Direcional"
              description="Produtos pensados para orientar decisões — do preço à performance."
            />
            <FeatureCard
              icon={Sparkles}
              title="Evolutivo"
              description="Um ecossistema em construção, aprimorado a cada nova solução lançada."
            />
          </div>
        </div>
      </section>

      {/* 3. Produtos do ecossistema */}
      <section
        id="produtos"
        aria-labelledby="produtos-title"
        className="section-y bg-surface border-y border-border"
      >
        <div className="container-page">
          <SectionHeader
            eyebrow="Produtos"
            title={
              <span id="produtos-title">
                Soluções que compõem o ecossistema.
              </span>
            }
            description="Cada produto endereça uma etapa da jornada de um negócio digital — do preço à performance, da mídia à inteligência."
          />

          <ul className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6 not-prose">
            {PRODUCTS.map((product) => (
              <li key={product.name} className="flex">
                <ProductCard product={product} />
              </li>
            ))}
            <li className="flex md:col-span-2 lg:col-span-1">
              <FutureProductsCard />
            </li>
          </ul>
        </div>
      </section>

      {/* 4. Fluxo — como trabalham juntas */}
      <section aria-labelledby="fluxo-title" className="section-y">
        <div className="container-page">
          <SectionHeader
            eyebrow="Integração"
            title={
              <span id="fluxo-title">
                Como as soluções trabalham juntas.
              </span>
            }
            description="Um fluxo contínuo que conecta operação, precificação, aquisição e inteligência — para que cada decisão gere impacto real no negócio."
          />

          <ol className="mt-16 grid gap-4 md:grid-cols-5">
            {FLOW_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isLast = idx === FLOW_STEPS.length - 1;
              return (
                <li key={step.label} className="relative flex">
                  <div className="flex w-full flex-col rounded-2xl border border-border bg-background p-6 shadow-soft">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-primary">
                        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="mt-5 text-base font-semibold tracking-tight text-foreground">
                      {step.label}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                  {!isLast && (
                    <span
                      aria-hidden
                      className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 h-6 w-6 items-center justify-center rounded-full bg-background border border-border text-primary shadow-soft"
                    >
                      <ArrowRight className="h-3 w-3" strokeWidth={2} />
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* 5. Roadmap */}
      <section
        aria-labelledby="roadmap-title"
        className="section-y bg-surface border-y border-border"
      >
        <div className="container-page">
          <SectionHeader
            eyebrow="Roadmap"
            title={
              <span id="roadmap-title">
                A evolução do ecossistema Valtro.
              </span>
            }
            description="Um roteiro em construção. Priorizamos qualidade e maturidade — cada solução chega ao mercado no momento certo."
          />

          <ol className="mt-16 relative border-l border-border ml-3 space-y-8 max-w-2xl">
            {ROADMAP.map((item) => (
              <li key={item.title} className="relative pl-8">
                <span
                  aria-hidden
                  className="absolute -left-[9px] top-1.5 grid h-4 w-4 place-items-center rounded-full bg-background border border-border text-xs"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
                </span>
                <div className="flex items-center gap-2">
                  <span aria-hidden className="text-lg leading-none">
                    {item.emoji}
                  </span>
                  <h3 className="text-base font-semibold tracking-tight text-foreground">
                    {item.title}
                  </h3>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 6. CTA final */}
      <section aria-labelledby="cta-final-title" className="py-20 md:py-28">
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
                id="cta-final-title"
                className="text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05] text-white text-balance"
              >
                Comece hoje mesmo.
              </h2>
              <p className="mt-6 text-base md:text-lg text-white/80 max-w-xl mx-auto leading-relaxed">
                O Valtro Pricing já está disponível e representa o primeiro passo para uma
                gestão mais inteligente do seu negócio digital.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="https://pricing.valtrolabs.pro"
                  className="group inline-flex items-center gap-2 rounded-lg bg-white text-brand-deep px-6 py-3.5 text-sm font-semibold hover:bg-white/95 transition-all duration-200 shadow-elevated hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                >
                  Conheça o Valtro Pricing
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

function ProductCard({ product }: { product: EcosystemProduct }) {
  const { name, tagline, description, icon: Icon, status, href, order } = product;
  const isAvailable = status === "available";

  return (
    <article
      aria-label={`${name} — ${STATUS_LABEL[status]}`}
      className={`group relative flex w-full flex-col rounded-2xl border p-7 ${
        isAvailable
          ? "border-border bg-background shadow-soft card-hover hover:border-primary/30"
          : "border-dashed border-border bg-background/50"
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
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="mt-7 flex-1">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span className="font-mono text-foreground/40">{order}</span>
          <span aria-hidden className="h-px w-4 bg-border" />
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
          <span className="text-xs font-medium text-muted-foreground">Em breve</span>
        )}
      </div>
    </article>
  );
}

function FutureProductsCard() {
  return (
    <article
      aria-label="Futuras soluções"
      className="relative flex w-full flex-col rounded-2xl border border-dashed border-border bg-transparent p-7"
    >
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-muted text-muted-foreground">
        <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </div>
      <div className="mt-7 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Próximos capítulos
        </p>
        <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">
          Futuras soluções
        </h3>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Novas soluções serão adicionadas conforme o ecossistema evolui.
        </p>
      </div>
      <div className="mt-7 pt-6 border-t border-border">
        <span className="text-xs font-medium text-muted-foreground">Em breve</span>
      </div>
    </article>
  );
}
