import { Reveal, PresentationSection } from "@/components/portfolio/commercial/motion";
import { LayoutDashboard, CheckCircle2 } from "lucide-react";

export function SolutionSection() {
  const features = [
    "Identidade visual clara",
    "Serviços e produtos organizados",
    "Informações de localização e horários",
    "Canais de contato direto (WhatsApp, E-mail)",
    "Redes sociais integradas",
  ];

  return (
    <PresentationSection id="solution" index="03" eyebrow="A Solução">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <h2 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Uma presença digital própria organiza essa experiência.
          </h2>
          <p className="mt-6 text-xl font-medium text-primary">
            Tudo o que seu cliente precisa para conhecer sua empresa e dar o próximo passo.
          </p>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <LayoutDashboard className="h-8 w-8 text-primary" />
              <h3 className="text-xl font-semibold">O Site Profissional</h3>
            </div>
            <ul className="space-y-4">
              {features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-lg text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </PresentationSection>
  );
}
