import { ArrowRight, ShieldCheck } from "lucide-react";
import { HeroVisual } from "./hero-visual";

const MARKETPLACES = ["Shopee", "Mercado Livre", "Amazon", "Magalu", "Shopify"] as const;

export function Hero() {
  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="relative overflow-hidden pt-36 pb-24 md:pt-44 md:pb-32"
    >
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" aria-hidden />
      <div
        className="absolute inset-0 bg-grid-subtle opacity-70 [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_70%)] pointer-events-none"
        aria-hidden
      />

      <div className="container-page relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-primary shadow-soft">
              <span className="relative flex h-1.5 w-1.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary/60 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
              </span>
              Ecossistema Valtro Labs · Beta
            </div>

            <h1
              id="hero-title"
              className="mt-8 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05] text-foreground text-balance"
            >
              Criamos software inteligente para{" "}
              <span className="text-primary">simplificar negócios digitais</span>.
            </h1>

            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
              A Valtro Labs desenvolve soluções próprias para simplificar operações,
              apoiar decisões e impulsionar negócios digitais. Nossa primeira solução
              ajuda vendedores de marketplaces a precificar com mais segurança e
              lucratividade.
            </p>

            <div className="mt-12 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-4">
              <a
                href="https://pricing.valtrolabs.pro"
                className="group inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3.5 text-sm font-medium hover:bg-primary-hover transition-all duration-200 shadow-elevated hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Começar com o Valtro Pricing
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </a>
              <a
                href="/portfolio"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-6 py-3.5 text-sm font-medium text-foreground hover:border-primary/40 hover:text-primary hover:bg-accent/50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Ver Portfólio
              </a>
            </div>

            <div className="mt-10 flex flex-col gap-3">
              <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
                Soluções pensadas para negócios digitais presentes em
              </p>
              <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {MARKETPLACES.map((m) => (
                  <li
                    key={m}
                    className="text-sm font-medium text-foreground/70"
                  >
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div
            className="relative animate-fade-up [animation-delay:120ms]"
            aria-hidden
          >
            <HeroVisual />
          </div>
        </div>
      </div>
    </section>
  );
}
