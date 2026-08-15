import { motion } from "framer-motion";
import { DynamicText, usePresentationContext } from "@/modules/commercial/presentation-context";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Clock, Phone, Scissors, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const Section = ({ children, className, "data-index": dataIndex }: { children: React.ReactNode; className?: string; "data-index"?: string }) => (
  <section 
    data-index={dataIndex}
    className={cn("min-h-screen w-full flex flex-col items-center justify-center p-6 md:p-12 snap-start relative overflow-hidden", className)}
  >
    {children}
  </section>
);

export function BarbeariaPresentation() {
  const [activeSection, setActiveSection] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute("data-index") || "0");
            setActiveSection(index);
          }
        });
      },
      { threshold: 0.5, rootMargin: "-10% 0px -10% 0px" }
    );

    document.querySelectorAll("section[data-index]").forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-background text-foreground font-sans selection:bg-accent/30 snap-y snap-mandatory h-screen overflow-y-auto overflow-x-hidden">
      {/* Progress Indicator */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-300",
              isHydrated && activeSection === i ? "bg-accent h-6" : "bg-foreground/20"
            )}
          />
        ))}
      </div>

      <Section data-index="0" className="bg-background">
        <motion.div className="text-center z-10 space-y-8 max-w-4xl" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}>
          <span className="text-accent font-medium tracking-[0.2em] uppercase text-sm">Identidade e Estilo</span>
          <h1 className="text-6xl md:text-8xl font-serif leading-tight">
            <DynamicText template="A nova era digital da {{empresa}}" />
          </h1>
          <p className="text-xl text-foreground/70 font-light">Vamos falar sobre como a sua barbearia é percebida antes mesmo do cliente entrar pela porta.</p>
          <div className="pt-12 animate-bounce"><ChevronDown className="w-8 h-8 mx-auto text-foreground/30" /></div>
        </motion.div>
      </Section>

      <Section data-index="1" className="bg-muted">
        <div className="max-w-4xl space-y-8">
          <h2 className="text-4xl md:text-5xl font-serif"><DynamicText template="Quando alguém encontra a {{empresa}} pela primeira vez, o que essa pessoa enxerga?" /></h2>
          <p className="text-lg text-foreground/70">Instagram e WhatsApp são vitais, mas a sua presença digital transmite a mesma qualidade que você entrega na cadeira?</p>
        </div>
      </Section>

      <Section data-index="2" className="bg-background">
        <div className="max-w-4xl space-y-8">
          <h2 className="text-4xl font-serif">Sua barbearia não vende apenas um corte.</h2>
          <p className="text-xl text-foreground/70">Vende estilo, confiança e identidade. Uma presença própria comunica tudo isso antes do primeiro atendimento.</p>
        </div>
      </Section>

      <Section data-index="3" className="bg-muted">
        <div className="max-w-4xl space-y-8">
          <h2 className="text-4xl font-serif">O que a experiência digital pode mostrar</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {["Serviços & Estilo", "Profissionais", "Localização", "Agendamento"].map(item => (
              <div key={item} className="p-6 border border-border bg-card rounded-xl">{item}</div>
            ))}
          </div>
        </div>
      </Section>

      <Section data-index="4" className="bg-primary text-primary-foreground">
        <div className="text-center space-y-8">
          <h2 className="text-5xl font-serif">Vamos colocar isso na tela?</h2>
          <Button size="lg" variant="secondary" className="rounded-full px-12">VER DEMONSTRAÇÃO (EM BREVE)</Button>
          <p className="italic opacity-80">(Experiência 100% personalizada)</p>
        </div>
      </Section>

      <Section data-index="5" className="bg-background">
        <div className="text-center space-y-8">
          <h2 className="text-4xl font-serif">Sendo encontrado localmente</h2>
          <p className="max-w-2xl text-lg text-foreground/70">Facilite a descoberta para quem busca uma barbearia de referência na sua região.</p>
        </div>
      </Section>

      <Section data-index="6" className="bg-muted">
        <div className="text-center space-y-8">
          <h2 className="text-4xl font-serif">Valor real: Confiança</h2>
          <p className="max-w-2xl text-lg text-foreground/70">A sua vitrine digital deve ser tão impecável quanto o seu serviço.</p>
        </div>
      </Section>

      <Section data-index="7" className="bg-background">
        <div className="text-center space-y-8">
          <h2 className="text-4xl font-serif">Vamos transformar sua barbearia?</h2>
          <p className="text-lg text-foreground/70">Este é apenas o começo. Vamos criar uma experiência que tenha a cara do seu negócio.</p>
        </div>
      </Section>
    </div>
  );
}
