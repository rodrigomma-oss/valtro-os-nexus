import { motion } from "framer-motion";
import { DynamicText, usePresentationContext } from "@/modules/commercial/presentation-context";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Clock, Phone, ShieldCheck, Heart, Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const Section = ({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) => (
  <section 
    id={id}
    className={cn("min-h-screen w-full flex flex-col items-center justify-center p-6 md:p-12 snap-start relative overflow-hidden", className)}
  >
    {children}
  </section>
);

export function PetShopPresentation() {
  const { empresa, cidade } = usePresentationContext();
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
      { 
        threshold: 0.5,
        rootMargin: "-10% 0px -10% 0px"
      }
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
              activeSection === i ? "bg-accent h-6" : "bg-foreground/20"
            )}
          />
        ))}
      </div>

      {/* SEÇÃO 01 — ABERTURA */}
      <Section data-index="0" className="bg-background">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary rounded-full blur-[120px] -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent rounded-full blur-[120px] -ml-48 -mb-48" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center z-10 space-y-8 max-w-4xl"
        >
          <span className="text-accent font-medium tracking-[0.2em] uppercase text-sm">Experiência Digital Premium</span>
          <h1 className="text-6xl md:text-8xl font-serif leading-tight">
            <DynamicText template="Uma nova experiência digital para a {{empresa}}" />
          </h1>
          <p className="text-xl md:text-2xl text-foreground/70 font-light max-w-2xl mx-auto">
            Elevando o padrão de cuidado e conexão entre você e seus clientes.
          </p>
          <div className="pt-12 animate-bounce">
            <ChevronDown className="w-8 h-8 mx-auto text-foreground/30" />
          </div>
        </motion.div>
      </Section>

      {/* SEÇÃO 02 — OPORTUNIDADE */}
      <Section data-index="1" className="bg-foreground text-background">
        <div className="max-w-5xl w-full grid md:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <h2 className="text-4xl md:text-5xl font-serif leading-tight">
              <DynamicText template="Quando um novo cliente procura pela {{empresa}}, o que ele encontra?" />
            </h2>
            <p className="text-lg text-background/70 leading-relaxed">
              Hoje, a jornada do cliente começa muito antes da visita física. A primeira impressão é construída em segundos, no mundo digital.
            </p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Heart, label: "Confiança" },
              { icon: ShieldCheck, label: "Segurança" },
              { icon: Clock, label: "Agilidade" },
              { icon: Sparkles, label: "Excelência" }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-background/5 border border-background/10 flex flex-col items-center gap-3 text-center"
              >
                <item.icon className="w-8 h-8 text-primary" />
                <span className="text-sm font-medium">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* SEÇÃO 03 — VALOR */}
      <Section data-index="2" className="bg-background">
        <div className="max-w-4xl text-center space-y-12">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-serif"
          >
            Uma vitrine digital que transmite cuidado e confiança
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8 text-left">
            {[
              { title: "Identidade", desc: "Refletindo a essência única da sua marca em cada pixel." },
              { title: "Profissionalismo", desc: "Posicionando seu negócio no topo do mercado pet." },
              { title: "Qualidade", desc: "Comunicando o valor real dos seus serviços e produtos." }
            ].map((card, i) => (
              <div key={i} className="space-y-4">
                <div className="w-12 h-px bg-accent" />
                <h3 className="text-xl font-semibold">{card.title}</h3>
                <p className="text-foreground/60">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* SEÇÃO 04 — ESTRUTURA */}
      <Section data-index="3" className="bg-muted">
        <div className="max-w-6xl w-full space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-6xl font-serif">
              <DynamicText template="O que não pode faltar na presença digital da {{empresa}}" />
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Sparkles, label: "Serviços & Preços", color: "bg-primary/10" },
              { icon: MapPin, label: "Onde Estamos", color: "bg-accent/10" },
              { icon: Clock, label: "Horários de Atendimento", color: "bg-foreground/5" },
              { icon: Phone, label: "Contato Facilitado", color: "bg-primary/10" }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn("p-8 rounded-3xl flex flex-col gap-6 items-start transition-transform hover:-translate-y-2", item.color)}
              >
                <item.icon className="w-10 h-10 text-foreground" />
                <span className="text-lg font-medium leading-tight">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* SEÇÃO 05 — DEMONSTRAÇÃO */}
      <Section data-index="4" className="bg-primary text-primary-foreground">
        <div className="max-w-4xl text-center space-y-10">
          <h2 className="text-5xl md:text-7xl font-serif">Agora, vamos colocar essa ideia na tela.</h2>
          <p className="text-xl opacity-90">
            <DynamicText template="Veja um exemplo de como uma experiência como essa poderia funcionar para a {{empresa}}." />
          </p>
          <div className="pt-8">
            <Link to="/demo/petshop" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="secondary" className="h-16 px-12 text-lg rounded-full gap-3 group">
                VER DEMONSTRAÇÃO
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <p className="mt-4 text-sm opacity-60 italic">(Experiência demonstrativa de projeto 100% personalizável)</p>
          </div>
        </div>
      </Section>

      {/* SEÇÃO 06 — PRESENÇA LOCAL */}
      <Section data-index="5" className="bg-background">
        <div className="max-w-5xl w-full grid md:grid-cols-2 gap-16 items-center">
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-muted">
             {/* Simulação de mapa ou presença local visual */}
             <div className="absolute inset-0 flex items-center justify-center">
               <MapPin className="w-24 h-24 text-accent animate-pulse" />
             </div>
          </div>
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <h2 className="text-4xl md:text-6xl font-serif leading-tight">
              <DynamicText 
                template="Fortalecendo a presença da {{empresa}} em {{cidade}}" 
                fallbackCidade="na sua região"
              />
            </h2>
            <p className="text-lg text-foreground/70">
              Facilitamos o encontro entre quem ama seus pets e quem tem o melhor serviço para oferecer. Posicionamento claro sobre quem é você e onde te encontrar.
            </p>
          </motion.div>
        </div>
      </Section>

      {/* SEÇÃO 07 — CONVERSÃO */}
      <Section data-index="6" className="bg-foreground text-background">
        <div className="max-w-4xl text-center space-y-12">
          <h2 className="text-5xl md:text-7xl font-serif leading-tight">
            <DynamicText template="Facilitando o caminho do cliente até a {{empresa}}" />
          </h2>
          <div className="bg-background/5 p-12 rounded-[3rem] border border-background/10 space-y-8">
            <p className="text-xl text-background/80">
              Menos cliques, mais conexão. Transformamos interesse em realidade através de uma experiência intuitiva e direta.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {["Informação Clara", "Agendamento", "Localização", "Confiança"].map((tag) => (
                <span key={tag} className="px-6 py-2 rounded-full border border-background/20 text-sm">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* SEÇÃO 08 — FECHAMENTO */}
      <Section data-index="7" className="bg-accent text-white">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="text-center space-y-12 max-w-4xl"
        >
          <h2 className="text-5xl md:text-8xl font-serif leading-tight">
            <DynamicText template="Vamos transformar essa ideia em um projeto para a {{empresa}}?" />
          </h2>
          <p className="text-2xl opacity-90 font-light">
            O próximo passo para a evolução digital do seu negócio começa agora.
          </p>
          <div className="pt-8 flex flex-col items-center gap-6">
             <div className="w-16 h-px bg-white/30" />
             <span className="text-sm tracking-widest uppercase opacity-70">Apresentação Exclusiva Valtro Labs</span>
          </div>
        </motion.div>
      </Section>
    </div>
  );
}
