import { Reveal, PresentationSection } from "@/components/portfolio/commercial/motion";

export function ProcessSection() {
  const steps = [
    {
      title: "Entendemos",
      text: "Conhecemos seu negócio e identificamos o que precisa ser apresentado.",
    },
    {
      title: "Construímos",
      text: "Criamos uma experiência visual adequada à sua marca e ao seu público.",
    },
    {
      title: "Publicamos",
      text: "Colocamos seu site no ar para que seus clientes possam encontrá-lo.",
    },
  ];

  return (
    <PresentationSection id="process" index="06" eyebrow="Processo">
      <Reveal className="mb-16">
        <h2 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Simples do início ao fim.
        </h2>
      </Reveal>

      <div className="relative">
        <div className="absolute left-4 top-0 h-full w-px bg-border/60 md:left-1/2" />
        <div className="space-y-16">
          {steps.map((step, i) => (
            <Reveal key={i} delay={i * 0.15}>
              <div className={`relative flex flex-col md:flex-row md:items-center ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                <div className="absolute left-4 top-2 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-primary bg-surface md:left-1/2" />
                <div className={`pl-12 md:w-1/2 md:pl-0 ${i % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12 md:text-left'}`}>
                  <span className="font-mono text-sm text-primary">Passo 0{i + 1}</span>
                  <h3 className="mt-2 text-2xl font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-3 text-muted-foreground leading-relaxed">{step.text}</p>
                </div>
                <div className="hidden md:block md:w-1/2" />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </PresentationSection>
  );
}
