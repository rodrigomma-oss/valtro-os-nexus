import { ArrowRight, Sparkles } from "lucide-react";
import { HeroVisual } from "./hero-visual";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" aria-hidden />
      <div className="absolute inset-0 bg-grid-subtle opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)] pointer-events-none" aria-hidden />

      <div className="container-page relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 backdrop-blur px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-brand/60 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand" />
              </span>
              Ecossistema Valtro Labs
            </div>

            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05] text-foreground">
              Transformamos{" "}
              <span className="text-gradient-brand">complexidade</span> em clareza.
            </h1>

            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
              A Valtro Labs desenvolve soluções inteligentes para simplificar decisões,
              automatizar processos e impulsionar negócios digitais.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="https://pricing.valtrolabs.pro"
                className="group inline-flex items-center gap-2 rounded-full bg-foreground text-background px-5 py-3 text-sm font-medium hover:opacity-90 transition-all shadow-elevated"
              >
                Conheça o Valtro Pricing
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#solucoes"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-5 py-3 text-sm font-medium text-foreground hover:border-foreground/30 transition-colors"
              >
                Conheça nossas soluções
              </a>
            </div>

            <div className="mt-8 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-brand" />
              Primeira solução já disponível • Novas ferramentas em desenvolvimento
            </div>
          </div>

          <div className="relative animate-fade-up [animation-delay:120ms]">
            <HeroVisual />
          </div>
        </div>
      </div>
    </section>
  );
}
