import { CheckCircle2 } from "lucide-react";

const PROBLEMS = [
  "Precificação manual e reativa que corrói a margem",
  "Planilhas isoladas sem visão unificada do negócio",
  "Falta de tempo para decisões estratégicas do dia a dia",
  "Ferramentas genéricas que não entendem marketplaces",
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
              Vender em marketplace virou um problema de software — não de esforço.
            </h2>
            <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed">
              A Valtro Labs nasceu para resolver o gargalo real do vendedor digital brasileiro:
              decisões críticas tomadas em planilhas, à noite, no achismo. Construímos
              tecnologia proprietária para que preço, mídia e análise deixem de ser tarefa
              e voltem a ser vantagem competitiva.
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
                engenharia, dados e design — que evolui junto com quem vende.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
