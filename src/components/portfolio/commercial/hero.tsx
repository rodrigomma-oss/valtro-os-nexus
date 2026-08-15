import { Reveal, PresentationSection } from "@/components/portfolio/commercial/motion";
import { ArrowRight, MessageSquare } from "lucide-react";

export function CommercialHero() {
  return (
    <section id="hero" className="relative flex min-h-[90vh] flex-col items-center justify-center border-b border-border/60 py-20 md:py-28">
      <div className="container-page text-center">
        <Reveal y={40}>
          <h1 className="text-5xl font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Seu negócio merece uma <br className="hidden md:block" />
            <span className="text-primary">presença digital</span> à altura.
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-xl text-muted-foreground leading-relaxed">
            Criamos sites profissionais que apresentam sua empresa, organizam suas informações e facilitam o contato com seus clientes.
          </p>
        </Reveal>
        
        <Reveal delay={0.3} y={20}>
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() => document.getElementById("discovery")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-lg bg-primary px-8 text-lg font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Conhecer nosso trabalho <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-8 text-lg font-medium text-foreground transition hover:bg-accent"
            >
              Quero conversar <MessageSquare className="h-5 w-5" />
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
