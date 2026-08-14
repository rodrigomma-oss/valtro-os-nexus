import { PresentationSection, Reveal } from "./motion";

const QUESTIONS = [
  "Quais serviços vocês oferecem?",
  "Onde vocês ficam?",
  "Qual o horário de funcionamento?",
  "Como funciona o banho e tosa?",
  "Vocês trabalham com quais produtos?",
  "Como faço para agendar?",
  "Como posso entrar em contato?",
] as const;

/** Seção 03 — dúvidas reais de quem acabou de encontrar o negócio. */
export function QuestionsSection() {
  return (
    <PresentationSection id="duvidas" index="03" eyebrow="Conhecer">
      <div className="max-w-2xl">
        <Reveal>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl">
            E quando ele quer <span className="text-primary">conhecer melhor</span> o seu negócio?
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
            Depois de encontrar o Pet Shop, começam as perguntas. São sempre as mesmas — e a
            resposta precisa estar fácil de achar.
          </p>
        </Reveal>
      </div>

      <ul className="mt-12 flex flex-wrap gap-3">
        {QUESTIONS.map((question, i) => (
          <Reveal key={question} delay={i * 0.05} y={16}>
            <li className="rounded-full border border-border bg-surface px-4 py-2.5 text-sm text-foreground shadow-soft">
              “{question}”
            </li>
          </Reveal>
        ))}
      </ul>

      <Reveal delay={0.1} className="mt-12 max-w-2xl">
        <p className="border-l-2 border-primary pl-5 text-base leading-relaxed text-muted-foreground md:text-lg">
          Hoje essas respostas costumam estar divididas entre a ficha do Google, a bio do
          Instagram, uma publicação antiga do Facebook e a conversa no WhatsApp.
        </p>
      </Reveal>
    </PresentationSection>
  );
}
