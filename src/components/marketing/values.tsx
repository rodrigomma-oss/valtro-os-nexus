import { Eye, Feather, Gauge, Infinity as InfinityIcon } from "lucide-react";

const VALUES = [
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
    <section className="py-24 md:py-32 bg-surface border-y border-border">
      <div className="container-page">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Princípios
          </div>
          <h2 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight text-foreground">
            Nossa forma de construir tecnologia.
          </h2>
        </div>

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {VALUES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="group rounded-2xl border border-border bg-background p-7 shadow-soft hover:shadow-elevated hover:border-primary/30 transition-all duration-200"
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-soft text-primary group-hover:scale-105 transition-transform">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                {title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
