import { Boxes, Cpu, LineChart, Sparkles } from "lucide-react";

const HIGHLIGHTS = [
  { icon: Cpu, label: "Desenvolvimento próprio" },
  { icon: Boxes, label: "Marketplaces & automação" },
  { icon: LineChart, label: "Inteligência de negócios" },
  { icon: Sparkles, label: "Produtividade em escala" },
];

export function About() {
  return (
    <section id="sobre" className="py-24 md:py-32">
      <div className="container-page">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          <div className="lg:col-span-5">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-brand">
              Quem somos
            </div>
            <h2 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight">
              Uma empresa brasileira construindo o futuro dos negócios digitais.
            </h2>
          </div>

          <div className="lg:col-span-7 space-y-5 text-base md:text-lg text-muted-foreground leading-relaxed">
            <p>
              A <span className="text-foreground font-medium">Valtro Labs</span> é uma empresa
              de tecnologia dedicada ao desenvolvimento de soluções SaaS proprietárias, criadas
              para tornar operações digitais mais simples, inteligentes e eficientes.
            </p>
            <p>
              Combinamos engenharia de software, dados e design para entregar ferramentas
              que apoiam decisões, automatizam processos e ampliam a performance de
              marketplaces, e-commerces e operações digitais.
            </p>

            <div className="mt-8 grid sm:grid-cols-2 gap-3">
              {HIGHLIGHTS.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated px-4 py-3"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
