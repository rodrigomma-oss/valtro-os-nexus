import { motion } from "framer-motion";
import { DynamicText, usePresentationContext } from "@/modules/commercial/presentation-context";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Clock, Phone, Scissors, ChevronDown, Star, Layout, Smartphone, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const Section = ({ children, className, id, "data-index": dataIndex }: { children: React.ReactNode; className?: string; id?: string; "data-index"?: string }) => (
  <section 
    id={id}
    data-index={dataIndex}
    className={cn("min-h-screen w-full flex flex-col items-center justify-center p-6 md:p-12 snap-start relative overflow-hidden", className)}
  >
    {children}
  </section>
);

export function BarbeariaPresentation() {
  const { empresa } = usePresentationContext();
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
              isHydrated && activeSection === i ? "bg-accent h-6" : "bg-foreground/20"
            )}
          />
        ))}
      </div>

      {/* SEÇÃO 01 — ABERTURA */}
      <Section data-index="0" className="bg-background">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[120px] -ml-48 -mb-48" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center z-10 space-y-8 max-w-4xl"
        >
          <span className="text-accent font-medium tracking-[0.2em] uppercase text-sm">Identidade & Estilo Digital</span>
          <h1 className="text-6xl md:text-8xl font-serif leading-tight">
            <DynamicText template="A presença digital da {{empresa}}" />
          </h1>
          <p className="text-xl md:text-2xl text-foreground/70 font-light max-w-2xl mx-auto">
            Vamos falar sobre como a sua barbearia é percebida antes mesmo do cliente entrar pela porta.
          </p>
          <div className="pt-12 animate-bounce">
            <ChevronDown className="w-8 h-8 mx-auto text-foreground/30" />
          </div>
        </motion.div>
      </Section>

      {/* SEÇÃO 02 — PRIMEIRA IMPRESSÃO */}
      <Section data-index="1" className="bg-muted text-foreground">
        <div className="max-w-5xl w-full grid md:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <h2 className="text-4xl md:text-5xl font-serif leading-tight">
              <DynamicText template="Quando alguém encontra a {{empresa}} pela primeira vez, o que essa pessoa enxerga?" />
            </h2>
            <p className="text-lg text-foreground/70 leading-relaxed">
              Google, Instagram, indicações... O cliente descobre você por vários caminhos. Mas a sua vitrine digital transmite a mesma qualidade que você entrega na cadeira?
            </p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Search, label: "Busca Google" },
              { icon: Smartphone, label: "Redes Sociais" },
              { icon: Users, label: "Indicações" },
              { icon: Star, label: "Avaliações" }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-background border border-border flex flex-col items-center gap-3 text-center"
              >
                <item.icon className="w-8 h-8 text-accent" />
                <span className="text-sm font-medium">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* SEÇÃO 03 — POSICIONAMENTO */}
      <Section data-index="2" className="bg-background">
        <div className="max-w-4xl text-center space-y-12">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-serif"
          >
            Você não vende apenas um corte de cabelo.
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8 text-left">
            {[
              { title: "Estilo", desc: "Uma marca que reflete a atitude e personalidade do seu espaço." },
              { title: "Confiança", desc: "Transmitindo autoridade e domínio técnico antes do primeiro contato." },
              { title: "Experiência", desc: "Comunicando o ambiente e o relacionamento que o cliente encontrará." }
            ].map((card, i) => (
              <div key={i} className="space-y-4 p-6 border border-border/50 rounded-2xl bg-muted/20">
                <div className="w-12 h-px bg-accent" />
                <h3 className="text-xl font-semibold uppercase tracking-wider">{card.title}</h3>
                <p className="text-foreground/60 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* SEÇÃO 04 — O QUE A EXPERIÊNCIA DIGITAL PODE MOSTRAR */}
      <Section data-index="3" className="bg-muted">
        <div className="max-w-6xl w-full space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-6xl font-serif">
              Impacto que gera decisão
            </h2>
            <p className="text-xl text-foreground/60 italic font-light">Muito além de um site, uma ferramenta de conversão e conveniência.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Scissors, label: "Galeria de Cortes & Estilo", color: "bg-card border border-border" },
              { icon: Users, label: "Nossos Profissionais", color: "bg-card border border-border" },
              { icon: Clock, label: "Agendamento Online", color: "bg-card border border-border" },
              { icon: Layout, label: "Serviços & Diferenciais", color: "bg-card border border-border" }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn("p-8 rounded-3xl flex flex-col gap-6 items-center text-center transition-all hover:border-accent/50 group", item.color)}
              >
                <item.icon className="w-10 h-10 text-accent group-hover:scale-110 transition-transform" />
                <span className="text-lg font-medium leading-tight">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* SEÇÃO 05 — DEMONSTRAÇÃO */}
      <Section data-index="4" className="bg-primary text-primary-foreground">
        <div className="max-w-4xl text-center space-y-10">
          <h2 className="text-5xl md:text-7xl font-serif">Agora quero te mostrar, na prática, como isso poderia ficar.</h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto leading-relaxed text-balance">
            <DynamicText template="Até aqui eu te mostrei a ideia. Agora quero colocar isso na tela para a {{empresa}}." />
          </p>
          <div className="pt-8">
            <Link 
              to="/demo/barbearia" 
              target="_blank"
              className="no-underline inline-block"
            >
              <Button size="lg" variant="secondary" className="h-16 px-12 text-lg rounded-full gap-3 group border-2 border-primary-foreground/20">
                VER DEMONSTRAÇÃO
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <p className="mt-6 text-sm opacity-80 italic font-medium tracking-wide">(Experiência em desenvolvimento • 100% personalizável)</p>
          </div>
        </div>
      </Section>

      {/* SEÇÃO 06 — PRESENÇA LOCAL */}
      <Section data-index="5" className="bg-background">
        <div className="max-w-5xl w-full grid md:grid-cols-2 gap-16 items-center">
          <div className="relative w-full flex justify-center items-center">
            {/* Mockup de Celular - Estilo Barber Dark */}
            <div className="relative w-[280px] h-[580px] bg-zinc-950 rounded-[3rem] border-[8px] border-zinc-900 shadow-2xl overflow-hidden ring-1 ring-accent/20">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-zinc-900 rounded-b-2xl z-20" />
              <div className="absolute inset-0 z-10 bg-zinc-900 flex items-center justify-center">
                <div className="text-center p-4">
                  <MapPin className="w-12 h-12 text-accent mx-auto mb-4 opacity-50" />
                  <p className="text-[10px] uppercase tracking-tighter text-foreground/40 font-bold italic">Mapa Interativo & Localização</p>
                </div>
              </div>
            </div>
            {/* Efeito de brilho de fundo */}
            <div className="absolute -z-10 w-64 h-64 bg-accent/20 rounded-full blur-[100px]" />
          </div>

          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <h2 className="text-4xl md:text-5xl font-serif leading-tight">Presença Local Estratégica</h2>
            <p className="text-lg text-foreground/70 leading-relaxed">
              Facilite a jornada de quem busca "barbearia perto de mim". Horários, localização e facilidade de contato em um único lugar, transmitindo confiança imediata.
            </p>
            <div className="space-y-4">
              {[
                { icon: MapPin, text: "Fácil de encontrar" },
                { icon: Clock, text: "Horários sempre atualizados" },
                { icon: Phone, text: "Contato em um clique" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 text-accent font-medium uppercase tracking-tighter text-sm">
                  <item.icon className="w-5 h-5" />
                  {item.text}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </Section>

      {/* SEÇÃO 07 — VALOR */}
      <Section data-index="6" className="bg-muted">
        <div className="max-w-4xl text-center space-y-12">
          <h2 className="text-5xl font-serif">A sua vitrine digital deve ser tão impecável quanto o seu serviço.</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-10 bg-background border border-border rounded-[2rem] space-y-4">
              <span className="text-accent text-3xl font-serif italic">01</span>
              <h3 className="text-2xl font-serif tracking-tight">Primeira Impressão</h3>
              <p className="text-foreground/60 leading-relaxed text-sm">Convertendo visitantes em clientes recorrentes desde o primeiro clique.</p>
            </div>
            <div className="p-10 bg-background border border-border rounded-[2rem] space-y-4">
              <span className="text-accent text-3xl font-serif italic">02</span>
              <h3 className="text-2xl font-serif tracking-tight">Posicionamento Premium</h3>
              <p className="text-foreground/60 leading-relaxed text-sm">Elevando a percepção de valor e diferenciando sua marca no mercado local.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* SEÇÃO 08 — FECHAMENTO */}
      <Section data-index="7" className="bg-background">
        <div className="absolute inset-0 bg-accent/5" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="text-center z-10 space-y-12 max-w-3xl"
        >
          <h2 className="text-5xl md:text-7xl font-serif tracking-tight">Vamos transformar essa ideia na cara da sua barbearia?</h2>
          <p className="text-xl text-foreground/70 font-light leading-relaxed">
            O que mostramos aqui é uma base. O projeto real será esculpido de acordo com a sua identidade, estilo e as necessidades únicas do seu negócio.
          </p>
          <div className="pt-8 flex flex-col items-center gap-6">
            <Button size="lg" className="h-16 px-12 text-lg rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold tracking-tight">
              INICIAR PROJETO PERSONALIZADO
            </Button>
            <p className="text-xs uppercase tracking-widest text-foreground/40 font-bold">Valtro Labs • Presença Digital de Alto Impacto</p>
          </div>
        </motion.div>
      </Section>
    </div>
  );
}
