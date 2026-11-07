import {
  CalendarCheck,
  Clock,
  Images,
  MapPin,
  MessageCircle,
  ShoppingBag,
  Scissors,
  Sparkles,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PresentationSection, Reveal } from "./motion";

interface Block {
  icon: LucideIcon;
  title: string;
  description: string;
}

const BLOCKS: Block[] = [
  {
    icon: Sparkles,
    title: "Apresentação",
    description: "Quem somos, história do Pet Shop e por que escolher a sua empresa.",
  },
  {
    icon: Scissors,
    title: "Serviços",
    description: "Banho, tosa, cuidados e demais serviços explicados com clareza.",
  },
  {
    icon: ShoppingBag,
    title: "Produtos",
    description: "Categorias e principais produtos disponíveis na loja.",
  },
  {
    icon: Images,
    title: "Galeria",
    description: "Fotos reais da estrutura, da equipe e do resultado dos serviços.",
  },
  {
    icon: Star,
    title: "Avaliações",
    description: "Espaço para apresentar as avaliações que o negócio já recebe.",
  },
  {
    icon: MapPin,
    title: "Localização",
    description: "Endereço, mapa e orientações de como chegar.",
  },
  {
    icon: Clock,
    title: "Horário",
    description: "Dias e horários de atendimento sempre visíveis.",
  },
  {
    icon: MessageCircle,
    title: "Contato",
    description: "WhatsApp, telefone e redes sociais a um toque de distância.",
  },
  {
    icon: CalendarCheck,
    title: "Agendamento",
    description: "Chamada para ação que facilita o pedido de horário.",
  },
];

/** Seção 06 — blocos que podem compor o site. */
export function FeaturesSection() {
  return (
    <PresentationSection id="estrutura" index="06" eyebrow="O que pode existir no site">
      <div className="max-w-2xl">
        <Reveal>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl">
            Estrutura pensada para <span className="text-primary">um Pet Shop</span>.
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
            Cada bloco existe para responder uma dúvida real de quem chega ao site. A combinação é
            definida junto com o negócio.
          </p>
        </Reveal>
      </div>

      <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BLOCKS.map((block, i) => (
          <Reveal key={block.title} delay={(i % 3) * 0.06}>
            <li className="flex h-full flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-soft transition-colors duration-200 hover:border-primary/40">
              <block.icon className="h-5 w-5 text-primary" aria-hidden />
              <h3 className="text-base font-semibold text-foreground">{block.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{block.description}</p>
            </li>
          </Reveal>
        ))}
      </ul>
    </PresentationSection>
  );
}
