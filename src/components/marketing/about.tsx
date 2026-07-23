import { Boxes, Cpu, LineChart, Sparkles } from "lucide-react";

const HIGHLIGHTS = [
  { icon: Cpu, label: "Desenvolvimento próprio" },
  { icon: Boxes, label: "Marketplaces & automação" },
  { icon: LineChart, label: "Inteligência de negócios" },
  { icon: Sparkles, label: "Produtividade em escala" },
] as const;

export function About() {
  return (
    <section id="sobre" aria-labelledby="sobre-title" className="section-y">
      <div className="container-page">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          <div className="lg:col-span-5">
            <p className="eyebrow">Quem somos</p>
            <h2
              id="sobre-title"
              className="mt-4 text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight text-foreground text-balance"
            >
              Uma empresa brasileira construindo o futuro dos negócios digitais.
            </h2>
          </div>

          <div className="lg:col-span-7 space-y-5 text-base md:text-lg text-muted-foreground leading-relaxed">
            <p>
              A <span className="text-foreground font-medium">Valtro Labs</span> é uma empresa
              de tecnologia dedicada ao desenvolvimento de soluções SaaS proprietárias, criadas
              para tornar operações de vendedores em marketplaces mais simples, inteligentes e eficientes.
            </p>
            <p>
              Combinamos engenharia de software, dados e design para entregar ferramentas
              que apoiam decisões, automatizam processos e ampliam a performance de
              marketplaces, e-commerces e operações digitais.
            </p>

            <ul className="mt-10 grid sm:grid-cols-2 gap-3 not-prose">
              {HIGHLIGHTS.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 shadow-soft transition-colors hover:border-primary/30"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-primary">
                    <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </div>
                  <span className="text-sm font-medium text-foreground">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
