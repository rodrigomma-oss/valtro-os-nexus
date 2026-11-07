import {
  AtSign,
  CalendarCheck,
  Clock,
  Images,
  MapPin,
  MessageCircle,
  Star,
  Store,
  Scissors,
} from "lucide-react";
import { PresentationSection, Reveal } from "./motion";

const SATELLITES = [
  { icon: Store, label: "Empresa" },
  { icon: Scissors, label: "Serviços" },
  { icon: MapPin, label: "Localização" },
  { icon: Clock, label: "Horário" },
  { icon: Images, label: "Fotos" },
  { icon: Star, label: "Avaliações" },
  { icon: MessageCircle, label: "WhatsApp" },
  { icon: AtSign, label: "Instagram" },
  { icon: CalendarCheck, label: "Agendamento" },
] as const;

/** Seção 05 — o site como ponto central da presença digital. */
export function SolutionSection() {
  return (
    <PresentationSection id="solucao" index="05" eyebrow="A oportunidade">
      <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div>
          <Reveal>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl">
              Uma presença digital própria{" "}
              <span className="text-primary">organiza essa experiência</span>.
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
              O site passa a ser o ponto central: reúne o que o cliente precisa saber, conversa com
              os seus canais atuais e conduz para o contato. Nada substitui o Instagram ou o
              WhatsApp — tudo passa a funcionar de forma conectada.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="relative">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-elevated md:p-8">
            <div className="rounded-xl bg-accent px-5 py-4 text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Site próprio
              </span>
              <p className="mt-1 text-sm text-muted-foreground">
                O centro da sua presença digital
              </p>
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {SATELLITES.map((item, i) => (
                <Reveal key={item.label} delay={0.15 + i * 0.04} y={12}>
                  <li className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-xs font-medium text-foreground">
                    <item.icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    {item.label}
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </PresentationSection>
  );
}
