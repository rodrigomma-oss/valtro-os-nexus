import { ArrowRight, ArrowUp } from "lucide-react";
import { Reveal } from "./motion";

/** Seção 11 — conversão final. */
export function FinalCtaSection() {
  return (
    <section
      id="conversa"
      data-presentation-section="conversa"
      aria-labelledby="final-cta-title"
      className="relative scroll-mt-24 border-t border-border/60 py-24 md:py-32"
    >
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" aria-hidden />
      <div className="container-page relative">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="font-mono text-xs tabular-nums text-primary">11</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2
              id="final-cta-title"
              className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl"
            >
              Podemos criar isso para o <span className="text-primary">seu Pet Shop</span>.
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Depois de conhecer a demonstração, podemos analisar rapidamente o seu negócio e
              entender qual estrutura faz mais sentido para sua empresa.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="/contato"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-7 py-4 text-sm font-semibold text-primary-foreground shadow-elevated transition-all duration-200 hover:bg-primary-hover hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
              >
                Quero conversar sobre meu projeto
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </a>
              <a
                href="#inicio"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-7 py-4 text-sm font-medium text-foreground transition-all duration-200 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
              >
                <ArrowUp className="h-4 w-4" aria-hidden />
                Voltar ao início
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
