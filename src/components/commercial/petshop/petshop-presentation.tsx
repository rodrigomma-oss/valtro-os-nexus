import { motion } from "framer-motion";
import { DynamicText, usePresentationContext } from "@/modules/commercial/presentation-context";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Clock, Phone, ShieldCheck, Heart, Sparkles, ChevronDown } from "lucide-react";
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
              isHydrated && activeSection === i ? "bg-accent h-6" : "bg-foreground/20"
            )}
          />
        ))}
      </div>

      {/* SEÇÃO 01 — ABERTURA */}
      <Section data-index="0" className="bg-background">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1450778869180-41d0601e046e?q=80&w=2086&auto=format&fit=crop"
            className="w-full h-full object-cover opacity-20 scale-105"
            alt=""
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center z-10 space-y-8 max-w-5xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-widest uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Experiência Digital Especializada
          </div>
          <h1 className="text-6xl md:text-8xl font-serif leading-[1.1] tracking-tight">
            <DynamicText template="O próximo passo digital da {{empresa}}" />
          </h1>
          <p className="text-xl md:text-2xl text-foreground font-medium max-w-2xl mx-auto leading-relaxed">
            Elevando o padrão de cuidado e conexão através de uma presença digital premium e acolhedora.
          </p>
          <div className="pt-12 animate-bounce opacity-40">
            <ChevronDown className="w-8 h-8 mx-auto" />
          </div>
        </motion.div>
      </Section>

      {/* SEÇÃO 02 — OPORTUNIDADE */}
      <Section data-index="1" className="bg-foreground text-background">
        <div className="absolute inset-0 z-0 opacity-10">
          <img 
            src="https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=1964&auto=format&fit=crop"
            className="w-full h-full object-cover"
            alt=""
          />
        </div>
        <div className="max-w-6xl w-full grid md:grid-cols-2 gap-16 items-center z-10">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <h2 className="text-4xl md:text-5xl font-serif leading-tight">
              <DynamicText template="Quando alguém busca por Pet Shop em {{cidade}}, o que encontra sobre a {{empresa}}?" />
            </h2>
            <p className="text-lg text-background/90 leading-relaxed font-medium">
              A jornada do tutor começa no digital. A primeira impressão é construída em segundos, e ela precisa transmitir o mesmo carinho que você dedica aos animais.
            </p>
          </motion.div>
          <div className="grid grid-cols-2 gap-6">
            {[
              { icon: Heart, label: "Acolhimento" },
              { icon: ShieldCheck, label: "Segurança" },
              { icon: Clock, label: "Praticidade" },
              { icon: Sparkles, label: "Excelência" }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-[2.5rem] bg-background/5 border border-background/10 flex flex-col items-center gap-4 text-center backdrop-blur-sm"
              >
                <item.icon className="w-10 h-10 text-primary" />
                <span className="text-base font-semibold text-background">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* SEÇÃO 03 — VALOR */}
      <Section data-index="2" className="bg-background">
        <div className="max-w-6xl w-full grid md:grid-cols-2 gap-16 items-center">
          <div className="relative rounded-[3rem] overflow-hidden aspect-[4/5] shadow-2xl order-2 md:order-1">
             <img 
              src="https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=2071&auto=format&fit=crop"
              className="w-full h-full object-cover"
              alt="Cuidado e carinho com pet"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
          <div className="space-y-12 order-1 md:order-2">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-serif leading-tight"
            >
              Uma vitrine que transmite <span className="text-primary italic">cuidado</span>
            </motion.h2>
            <div className="space-y-10">
              {[
                { title: "Identidade Visual", desc: "Refletindo a essência e o amor pelos animais em cada detalhe." },
                { title: "Autoridade no Nicho", desc: "Posicionando seu negócio como a principal referência da região." },
                { title: "Percepção de Valor", desc: "Comunicando a qualidade superior dos seus serviços." }
              ].map((card, i) => (
                <div key={i} className="space-y-4">
                  <div className="w-12 h-1 bg-accent rounded-full" />
                  <h3 className="text-2xl font-semibold">{card.title}</h3>
                  <p className="text-foreground/80 text-lg leading-relaxed font-medium">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* SEÇÃO 04 — ESTRUTURA */}
      <Section data-index="3" className="bg-muted">
        <div className="max-w-6xl w-full space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-6xl font-serif">
              <DynamicText template="O que não pode faltar no site da {{empresa}}" />
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Sparkles, label: "Serviços & Banho", color: "bg-primary/10", img: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=200&h=200&fit=crop" },
              { icon: MapPin, label: "Onde Estamos", color: "bg-accent/10", img: "https://images.unsplash.com/photo-1548191265-cc70d3d45ba1?q=80&w=200&h=200&fit=crop" },
              { icon: Clock, label: "Horários", color: "bg-foreground/5", img: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=200&h=200&fit=crop" },
              { icon: Phone, label: "WhatsApp Direto", color: "bg-primary/10", img: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=200&h=200&fit=crop" }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn("p-6 rounded-[2.5rem] flex flex-col gap-6 items-center text-center transition-transform hover:-translate-y-2 bg-white shadow-sm border border-black/5", "")}
              >
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-muted">
                  <img src={item.img} className="w-full h-full object-cover" alt="" />
                </div>
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
          <p className="text-xl text-primary-foreground font-medium">
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
        <div className="max-w-6xl w-full grid md:grid-cols-2 gap-20 items-center">
          <div className="relative w-full flex justify-center items-center">
            {/* Contexto Pet Shop ao redor do celular */}
            <div className="absolute -left-10 -top-10 w-40 h-40 rounded-3xl overflow-hidden shadow-xl rotate-[-12deg] z-0 hidden lg:block">
              <img src="https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=400&fit=crop" className="w-full h-full object-cover" alt="" />
            </div>
            <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-[2rem] overflow-hidden shadow-xl rotate-[8deg] z-0 hidden lg:block">
              <img src="https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=400&fit=crop" className="w-full h-full object-cover" alt="" />
            </div>

            {/* Mockup de Celular */}
            <div className="relative w-[280px] h-[580px] bg-zinc-900 rounded-[3.5rem] border-[10px] border-zinc-800 shadow-2xl overflow-hidden ring-1 ring-white/10 z-10">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-7 bg-zinc-800 rounded-b-3xl z-20" />
              <div className="absolute inset-0 z-10 bg-muted">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3153.835434509374!2d-122.4194155!3d37.7749295!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8085809c6c8f4459%3A0xb10ed6d9b5050fa5!2sTwitter%20HQ!5e0!3m2!1sen!2sbr!4v1633000000000!5m2!1sen!2sbr"
                  className="w-full h-full border-0 grayscale-[0.2]"
                  allowFullScreen
                  loading="lazy"
                  title="Localização"
                />
              </div>
            </div>
          </div>
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <h2 className="text-4xl md:text-6xl font-serif leading-tight">
              <DynamicText 
                template="Fortalecendo a {{empresa}} em {{cidade}}" 
                fallbackCidade="na sua região"
              />
            </h2>
            <p className="text-xl text-foreground/80 leading-relaxed font-medium">
              Facilitamos o encontro entre quem ama seus pets e quem tem o melhor cuidado para oferecer. Um posicionamento profissional onde seus clientes estão.
            </p>
            <div className="flex items-center gap-4 text-primary font-medium">
               <div className="w-12 h-px bg-primary" />
               <span>Presença local estratégica</span>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* SEÇÃO 07 — CONVERSÃO */}
      <Section data-index="6" className="bg-foreground text-background">
        <div className="max-w-4xl text-center space-y-12">
          <h2 className="text-5xl md:text-7xl font-serif leading-tight">
            <DynamicText template="Facilitando o caminho do tutor até a {{empresa}}" />
          </h2>
          <div className="bg-background/5 p-12 rounded-[3.5rem] border border-background/10 space-y-10 backdrop-blur-sm">
            <p className="text-2xl text-background font-medium leading-relaxed">
              Transformamos o interesse digital em agendamentos reais através de uma experiência intuitiva, acolhedora e eficiente.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {["Informação Acolhedora", "Agendamento Ágil", "Localização Clara", "Confiança Total"].map((tag) => (
                <span key={tag} className="px-8 py-3 rounded-full border border-background/40 text-sm font-bold bg-background/10 hover:bg-background/20 transition-colors cursor-default text-background">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* SEÇÃO 08 — FECHAMENTO */}
      <Section data-index="7" className="bg-primary text-primary-foreground">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=2000&auto=format&fit=crop"
            className="w-full h-full object-cover opacity-10"
            alt=""
          />
        </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="text-center space-y-12 max-w-5xl z-10"
        >
          <h2 className="text-5xl md:text-8xl font-serif leading-tight">
            <DynamicText template="Vamos construir o futuro da {{empresa}} juntos?" />
          </h2>
          <p className="text-2xl text-primary-foreground font-medium max-w-2xl mx-auto">
            O próximo capítulo da sua história digital começa aqui. Com cuidado, tecnologia e amor pelos animais.
          </p>
          <div className="pt-8 flex flex-col items-center gap-6">
             <div className="w-24 h-px bg-white/30" />
             <span className="text-sm tracking-[0.3em] uppercase opacity-70 font-bold">Apresentação Exclusiva · Valtro Labs</span>
          </div>
        </motion.div>
      </Section>
    </div>
  );
}
