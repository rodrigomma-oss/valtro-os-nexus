import { Facebook, Instagram, MapPin, MessageCircle, Search, Users } from "lucide-react";
import { PresentationSection, Reveal } from "./motion";

const CHANNELS = [
  { icon: Search, label: "Google" },
  { icon: MapPin, label: "Google Maps" },
  { icon: Instagram, label: "Instagram" },
  { icon: Facebook, label: "Facebook" },
  { icon: Users, label: "Indicação" },
  { icon: MessageCircle, label: "WhatsApp" },
] as const;

/** Seção 02 — pontos de descoberta que levam ao mesmo negócio. */
export function DiscoverySection() {
  return (
    <PresentationSection id="descoberta" index="02" eyebrow="Encontrar">
      <div className="max-w-2xl">
        <Reveal>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl">
            Seu cliente já está <span className="text-primary">procurando por você</span>.
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
            Todos os dias alguém procura por banho e tosa, ração ou atendimento veterinário perto
            de casa. Essa busca acontece em canais diferentes — e todos podem levar até a sua
            empresa.
          </p>
        </Reveal>
      </div>

      <ul className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {CHANNELS.map((channel, i) => (
          <Reveal key={channel.label} delay={i * 0.06}>
            <li className="flex h-full flex-col items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft">
              <channel.icon className="h-4 w-4 text-primary" aria-hidden />
              <span className="text-sm font-medium text-foreground">{channel.label}</span>
            </li>
          </Reveal>
        ))}
      </ul>

      <Reveal delay={0.1} className="mt-12">
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <div className="h-12 w-px bg-gradient-to-b from-transparent via-primary/40 to-primary" aria-hidden />
          <div className="rounded-xl border border-primary/20 bg-accent px-6 py-4">
            <p className="text-base font-medium text-foreground md:text-lg">
              Todos esses caminhos levam ao mesmo lugar: o seu negócio.
            </p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            Mas encontrar sua empresa é apenas o primeiro passo.
          </p>
        </div>
      </Reveal>
    </PresentationSection>
  );
}
