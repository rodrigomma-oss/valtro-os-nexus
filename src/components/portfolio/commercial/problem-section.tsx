import { Reveal, PresentationSection } from "@/components/portfolio/commercial/motion";
import { HelpCircle, AlertTriangle } from "lucide-react";

export function ProblemSection() {
  const questions = [
    "O que exatamente vocês oferecem?",
    "Quais são os diferenciais?",
    "Onde vocês ficam localizados?",
    "Qual o horário de funcionamento?",
    "Como entro em contato rápido?",
  ];

  return (
    <PresentationSection id="problem" index="02" eyebrow="O Problema">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <h2 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Encontrar sua empresa é apenas o primeiro passo.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Muitas vezes, as informações que seu cliente precisa estão dispersas, desatualizadas ou difíceis de encontrar.
          </p>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={i} className="flex items-center gap-4 rounded-xl border border-border/50 bg-surface/50 p-4 transition-transform hover:translate-x-2">
                <HelpCircle className="h-6 w-6 shrink-0 text-amber-500" />
                <span className="text-lg font-medium text-foreground">{q}</span>
              </div>
            ))}
            <div className="mt-8 text-center">
              <span className="text-sm font-semibold italic text-muted-foreground">— E se tudo isso estivesse em um único lugar?</span>
            </div>
          </div>
        </Reveal>
      </div>
    </PresentationSection>
  );
}
