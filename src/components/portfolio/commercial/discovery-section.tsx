import { Reveal, PresentationSection } from "@/components/portfolio/commercial/motion";
import { Search, Share2, MessageCircle, Users, Navigation } from "lucide-react";

export function DiscoverySection() {
  const channels = [
    { icon: Search, label: "Google", color: "text-blue-500" },
    { icon: Share2, label: "Redes Sociais", color: "text-pink-500" },
    { icon: MessageCircle, label: "WhatsApp", color: "text-green-500" },
    { icon: Users, label: "Indicação", color: "text-purple-500" },
    { icon: Navigation, label: "Google Maps", color: "text-red-500" },
  ];

  return (
    <PresentationSection id="discovery" index="01" eyebrow="Presença">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <h2 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Seu cliente já está procurando por você.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Hoje, seus clientes podem encontrar sua empresa pelo Google, redes sociais, indicação ou WhatsApp. O desafio é transformar esses pontos de contato em uma experiência clara e profissional.
          </p>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="relative flex min-h-[300px] items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-surface/30 p-8">
            <div className="relative z-10 flex flex-wrap justify-center gap-6">
              {channels.map((channel, i) => (
                <div key={i} className="flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className={`flex h-16 w-16 items-center justify-center rounded-xl bg-surface border border-border shadow-sm ${channel.color}`}>
                    <channel.icon className="h-8 w-8" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{channel.label}</span>
                </div>
              ))}
            </div>
            {/* Background elements to represent convergence */}
            <div className="absolute inset-0 z-0 flex items-center justify-center opacity-20">
               <div className="h-64 w-64 rounded-full border border-primary animate-pulse" />
            </div>
          </div>
        </Reveal>
      </div>
    </PresentationSection>
  );
}
