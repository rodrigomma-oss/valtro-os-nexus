import { ArrowRight, Sparkles } from "lucide-react";
import { HeroVisual } from "./hero-visual";

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
              Ecossistema Valtro Labs
            </div>

            <h1
              id="hero-title"
              className="mt-8 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05] text-foreground text-balance"
            >
              Transformamos <span className="text-primary">complexidade</span> em clareza.
            </h1>

            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
              A Valtro Labs desenvolve soluções inteligentes para simplificar decisões,
              automatizar processos e impulsionar negócios digitais de vendedores em marketplaces.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <a
                href="https://pricing.valtrolabs.pro"
                className="group inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3.5 text-sm font-medium hover:bg-primary-hover transition-colors shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Conheça o Valtro Pricing
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </a>
              <a
                href="#solucoes"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-6 py-3.5 text-sm font-medium text-foreground hover:border-primary/40 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Conheça nossas soluções
              </a>
            </div>

            <p className="mt-10 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
              Primeira solução já disponível · Novas ferramentas em desenvolvimento
            </p>
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
