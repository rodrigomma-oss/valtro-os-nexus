import { Construction } from "lucide-react";
import { Reveal } from "./motion";

/**
 * Seção 09 — transição para a futura demonstração.
 * A rota /portfolio/petshop/demo ainda não existe: o CTA fica preparado,
 * mas apresentado como "em preparação" para não afirmar algo inexistente.
 */
export function DemoTransitionSection() {
  return (
    <section
      id="demonstracao"
      data-presentation-section="demonstracao"
      aria-labelledby="demo-title"
      className="relative scroll-mt-24 overflow-hidden border-t border-border/60 py-24 md:py-32"
    >
      <div
        className="absolute inset-0 bg-[image:var(--gradient-brand)] pointer-events-none"
        aria-hidden
      />
      <div className="container-page relative">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="font-mono text-xs tabular-nums text-primary-foreground/70">09</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2
              id="demo-title"
              className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-primary-foreground md:text-4xl lg:text-5xl"
            >
              Agora vamos colocar essa ideia em prática.
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-primary-foreground/80 md:text-lg">
              Na próxima etapa, você poderá conhecer uma demonstração completa de como essa
              experiência pode funcionar para um Pet Shop.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="mt-10 flex flex-col items-center gap-3">
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="inline-flex items-center gap-2 rounded-lg bg-primary-foreground/95 px-8 py-4 text-base font-semibold text-brand-deep shadow-elevated transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-brand-deep"
              >
                <Construction className="h-4 w-4" aria-hidden />
                Ver demonstração
              </button>
              <p className="text-sm text-primary-foreground/70">
                Demonstração em preparação — será disponibilizada em breve.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
