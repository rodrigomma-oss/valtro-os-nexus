import { PresentationSection, Reveal } from "./motion";

const ITEMS = [
  "Logo",
  "Identidade visual",
  "Cores",
  "Fotos",
  "Serviços",
  "Informações",
  "Localização",
  "WhatsApp",
  "Instagram",
  "Conteúdo",
  "Chamadas para ação",
] as const;

/** Seção 08 — personalização por negócio. */
export function PersonalizationSection() {
  return (
    <PresentationSection id="personalizacao" index="08" eyebrow="Personalização">
      <div className="max-w-2xl">
        <Reveal>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl">
            Não seria um <span className="text-primary">site genérico</span>.
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
            Cada projeto é adaptado ao negócio. A base é sólida e testada; o que aparece na tela
            fala da sua marca, do seu atendimento e da sua região.
          </p>
        </Reveal>
      </div>

      <ul className="mt-12 flex flex-wrap gap-2.5">
        {ITEMS.map((item, i) => (
          <Reveal key={item} delay={i * 0.04} y={12}>
            <li className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground shadow-soft">
              {item}
            </li>
          </Reveal>
        ))}
      </ul>

      <Reveal delay={0.1} className="mt-12 max-w-2xl">
        <p className="text-xl font-semibold leading-snug tracking-tight text-foreground md:text-2xl">
          A estrutura é pensada para o negócio.{" "}
          <span className="text-primary">A experiência é construída para a marca.</span>
        </p>
      </Reveal>
    </PresentationSection>
  );
}
