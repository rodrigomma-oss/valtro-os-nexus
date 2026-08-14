import { PresentationSection, Reveal } from "./motion";

const STEPS = [
  {
    number: "01",
    title: "Diagnóstico",
    description: "Entendemos o negócio, o público e os objetivos antes de desenhar qualquer tela.",
  },
  {
    number: "02",
    title: "Desenvolvimento",
    description: "Construímos a estrutura, a experiência visual e os conteúdos do site.",
  },
  {
    number: "03",
    title: "Publicação",
    description: "Colocamos o projeto no ar em um domínio próprio, pronto para receber visitas.",
  },
] as const;

/** Seção 10 — jornada do projeto em três etapas. */
export function ProcessSection() {
  return (
    <PresentationSection id="processo" index="10" eyebrow="Como funciona o projeto">
      <div className="max-w-2xl">
        <Reveal>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl">
            Um caminho <span className="text-primary">simples e transparente</span>.
          </h2>
        </Reveal>
      </div>

      <ol className="relative mt-14 space-y-10 border-l border-border pl-8 md:space-y-12">
        {STEPS.map((step, i) => (
          <Reveal key={step.number} delay={i * 0.08}>
            <li className="relative">
              <span
                className="absolute -left-[2.28rem] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-primary bg-background"
                aria-hidden
              />
              <span className="font-mono text-xs tabular-nums text-primary">{step.number}</span>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                {step.title}
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
                {step.description}
              </p>
            </li>
          </Reveal>
        ))}
      </ol>
    </PresentationSection>
  );
}
