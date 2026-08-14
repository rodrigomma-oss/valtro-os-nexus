import { AtSign, MapPin, MessageCircle, Search, ThumbsUp } from "lucide-react";
import { PresentationSection, Reveal } from "./motion";

const FRAGMENTS = [
  { icon: Search, channel: "Google", detail: "Horário desatualizado" },
  { icon: AtSign, channel: "Instagram", detail: "Serviços nos stories antigos" },
  { icon: ThumbsUp, channel: "Facebook", detail: "Informações de outra época" },
  { icon: MessageCircle, channel: "WhatsApp", detail: "Tudo explicado de novo" },
  { icon: MapPin, channel: "Maps", detail: "Só endereço e telefone" },
] as const;

/** Seção 04 — a fragmentação da informação entre canais. */
export function ProblemSection() {
  return (
    <PresentationSection id="problema" index="04" eyebrow="O problema" className="bg-secondary/40">
      <div className="max-w-2xl">
        <Reveal>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl">
            Informação espalhada cria uma{" "}
            <span className="text-primary">experiência fragmentada</span>.
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
            Cada canal conta uma parte da história. O cliente monta o restante sozinho — e às vezes
            desiste no meio do caminho.
          </p>
        </Reveal>
      </div>

      <div className="mt-14 grid gap-3 md:grid-cols-5">
        {FRAGMENTS.map((item, i) => (
          <Reveal key={item.channel} delay={i * 0.07}>
            <div className="flex h-full flex-col gap-2 rounded-xl border border-border border-dashed bg-surface p-4">
              <item.icon className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="text-sm font-medium text-foreground">{item.channel}</span>
              <span className="text-xs leading-relaxed text-muted-foreground">{item.detail}</span>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.12} className="mt-10">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-5 text-center">
          <div
            className="h-14 w-px bg-gradient-to-b from-border via-primary/40 to-primary"
            aria-hidden
          />
          <p className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            E se tudo isso estivesse organizado em um único lugar?
          </p>
        </div>
      </Reveal>
    </PresentationSection>
  );
}
