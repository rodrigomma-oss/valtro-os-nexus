import { CheckCircle2 } from "lucide-react";

const PROBLEMS = [
  "Decisões críticas presas em planilhas e no achismo do dia a dia",
  "Operações digitais que crescem mais rápido do que os processos",
  "Ferramentas genéricas que não acompanham a realidade do negócio",
  "Falta de tecnologia própria para sustentar decisões estratégicas",
] as const;

export function About() {
  return (
    <section id="sobre" aria-labelledby="sobre-title" className="section-y">
      <div className="container-page">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          <div className="lg:col-span-5">
            <p className="eyebrow">Por que existimos</p>
            <h2
              id="sobre-title"
              className="mt-4 text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight text-foreground text-balance"
            >
              Negócios digitais crescem quando decisões deixam de depender só de esforço.
            </h2>
            <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed">
              À medida que os negócios digitais crescem, decisões importantes deixam
              de depender apenas de esforço e passam a exigir tecnologia. É para
              resolver esse desafio que a Valtro Labs desenvolve soluções simples,
              inteligentes e em constante evolução — começando pelo Valtro Pricing,
              a primeira aplicação dessa visão.
            </p>
          </div>

          <div className="lg:col-span-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
              Problemas que resolvemos
            </p>
            <ul className="mt-6 grid sm:grid-cols-2 gap-3 not-prose">
              {PROBLEMS.map((problem) => (
                <li
                  key={problem}
                  className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-4 shadow-soft transition-colors hover:border-primary/30"
                >
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span className="text-sm text-foreground leading-relaxed">
                    {problem}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-2xl border border-dashed border-border bg-brand-soft/40 px-5 py-4">
              <p className="text-sm text-foreground leading-relaxed">
                <span className="font-semibold text-primary">Nossa aposta:</span>{" "}
                um ecossistema modular, brasileiro e proprietário — construído com
                engenharia, dados e design — que evolui junto com cada negócio digital.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
