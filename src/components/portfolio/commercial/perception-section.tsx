import { Reveal, PresentationSection } from "@/components/portfolio/commercial/motion";
import { Eye, ShieldCheck, Target } from "lucide-react";

export function PerceptionSection() {
  const points = [
    { icon: Eye, title: "Clareza", text: "Seu cliente entende rapidamente o que você oferece." },
    { icon: ShieldCheck, title: "Confiança", text: "Sua presença digital transmite profissionalismo." },
    { icon: Target, title: "Ação", text: "O próximo passo para entrar em contato fica simples." },
  ];

  return (
    <PresentationSection id="perception" index="04" eyebrow="Valor">
      <Reveal className="mb-16 text-center">
        <h2 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Não é apenas sobre ter um site.
        </h2>
        <p className="mt-6 text-2xl font-light text-muted-foreground">
          É sobre como seu negócio é percebido.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {points.map((p, i) => (
          <Reveal key={i} delay={0.1 * i}>
            <div className="flex h-full flex-col items-center rounded-2xl bg-surface/50 p-8 text-center border border-border/50">
              <p.icon className="mb-6 h-12 w-12 text-primary" />
              <h3 className="mb-4 text-2xl font-semibold text-foreground">{p.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{p.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </PresentationSection>
  );
}
