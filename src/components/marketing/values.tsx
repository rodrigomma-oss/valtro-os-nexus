import { Eye, Feather, Gauge, Infinity as InfinityIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FeatureCard } from "@/components/shared/feature-card";

interface ValueItem {
  icon: LucideIcon;
  title: string;
  text: string;
}

const VALUES: ValueItem[] = [
  {
    icon: Eye,
    title: "Clareza",
    text: "Transformamos informações complexas em decisões simples.",
  },
  {
    icon: Feather,
    title: "Simplicidade",
    text: "Tecnologia feita para pessoas.",
  },
  {
    icon: Gauge,
    title: "Performance",
    text: "Ferramentas rápidas, eficientes e confiáveis.",
  },
  {
    icon: InfinityIcon,
    title: "Evolução Contínua",
    text: "Nossos produtos evoluem junto com nossos clientes.",
  },
];

export function Values() {
  return (
    <section
      aria-labelledby="valores-title"
      className="section-y bg-surface border-y border-border"
    >
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="eyebrow">Princípios</p>
          <h2
            id="valores-title"
            className="mt-4 text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight text-foreground text-balance"
          >
            Nossa forma de construir tecnologia.
          </h2>
        </div>

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {VALUES.map(({ icon, title, text }) => (
            <FeatureCard key={title} icon={icon} title={title} description={text} />
          ))}
        </div>
      </div>
    </section>
  );
}
