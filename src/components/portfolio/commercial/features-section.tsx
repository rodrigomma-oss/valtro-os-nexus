import { Reveal, PresentationSection } from "@/components/portfolio/commercial/motion";
import { Check } from "lucide-react";

export function FeaturesSection() {
  const items = [
    "Apresentação Institucional",
    "Listagem de Serviços",
    "Catálogo de Produtos",
    "Galeria de Fotos",
    "Localização Google Maps",
    "Horários de Funcionamento",
    "Link Direto WhatsApp",
    "Redes Sociais Integradas",
    "Chamadas para Ação (CTA)",
    "Informações de Contato",
  ];

  return (
    <PresentationSection id="features" index="05" eyebrow="Recursos">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <h2 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            O que construímos.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Cada projeto começa pelo negócio, não pelo template. Selecionamos os recursos que fazem sentido para o seu momento atual.
          </p>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-surface/30 p-4 border border-border/40 transition-colors hover:bg-surface/50">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <Check className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </PresentationSection>
  );
}
