import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Heart, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Phone, 
  ChevronRight, 
  CheckCircle2, 
  Scissors, 
  ShoppingBag,
  Star,
  Info,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

const Section = ({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) => (
  <section id={id} className={cn("py-20 px-6 md:px-12", className)}>
    <div className="max-w-7xl mx-auto w-full">
      {children}
    </div>
  </section>
);

export function PataECiaDemo() {
  const scrollToContact = () => {
    document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2D2D2D] font-sans selection:bg-[#E6D5B8]/30">
      {/* Banner de Demonstração */}
      <div className="bg-[#E6D5B8] text-[#5D4037] py-2 px-4 text-center text-xs font-medium tracking-wide uppercase flex items-center justify-center gap-2 sticky top-0 z-[60]">
        <Info className="w-3.5 h-3.5" />
        <span>Experiência demonstrativa • Valtro Labs</span>
      </div>

      {/* Header */}
      <header className="sticky top-8 mx-auto max-w-7xl z-50 px-6 mt-4">
        <nav className="bg-white/80 backdrop-blur-md border border-black/5 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#8E9775] rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#4A5D23]">PATA & CIA</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#inicio" className="text-sm font-medium hover:text-[#8E9775] transition-colors">Início</a>
            <a href="#servicos" className="text-sm font-medium hover:text-[#8E9775] transition-colors">Serviços</a>
            <a href="#diferenciais" className="text-sm font-medium hover:text-[#8E9775] transition-colors">Diferenciais</a>
            <a href="#contato" className="text-sm font-medium hover:text-[#8E9775] transition-colors">Localização</a>
          </div>

          <Button 
            onClick={scrollToContact}
            className="bg-[#D4A373] hover:bg-[#C29262] text-white rounded-xl px-6"
          >
            Agendar Atendimento
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <section id="inicio" className="pt-32 pb-20 px-6 md:px-12 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#8E9775]/10 text-[#4A5D23] text-sm font-medium">
              <Star className="w-4 h-4 fill-current" />
              <span>O cuidado que seu pet merece</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight text-[#2D2D2D]">
              Perto de quem <br />
              <span className="text-[#8E9775]">você ama.</span>
            </h1>
            <p className="text-xl text-[#2D2D2D]/70 max-w-lg leading-relaxed">
              Muito mais que um pet shop. Um centro de cuidados dedicado ao bem-estar, conforto e felicidade do seu melhor amigo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                size="lg" 
                onClick={scrollToContact}
                className="bg-[#D4A373] hover:bg-[#C29262] h-14 px-8 rounded-2xl text-lg shadow-lg shadow-[#D4A373]/20"
              >
                Agendar banho e tosa
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="h-14 px-8 rounded-2xl text-lg border-black/10"
                asChild
              >
                <a href="#servicos">Conheça nossos serviços</a>
              </Button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-[#8E9775]/20 rounded-[3rem] blur-3xl -z-10" />
            <div className="aspect-[4/5] rounded-[3rem] overflow-hidden bg-muted shadow-2xl relative group">
              <img 
                src="https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=2071&auto=format&fit=crop" 
                alt="Golden Retriever feliz em um ambiente de pet shop"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute bottom-8 left-8 right-8 bg-white/90 backdrop-blur p-6 rounded-2xl shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-muted">
                        <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="Tutor satisfeito" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex text-yellow-500 w-4 h-4 mb-1">
                      {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-current" />)}
                    </div>
                    <p className="text-xs font-semibold text-[#2D2D2D]">+2.000 pets atendidos com carinho</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Sobre a Pata & Cia */}
      <Section className="bg-white">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Onde o carinho encontra o profissionalismo.</h2>
            <p className="text-lg text-[#2D2D2D]/70 leading-relaxed">
              A Pata & Cia nasceu da paixão pelos animais e do desejo de oferecer um ambiente onde a segurança e o bem-estar são as prioridades absolutas. Nossa equipe é formada por profissionais apaixonados que entendem que cada pet é único.
            </p>
            <div className="grid grid-cols-2 gap-8 pt-4">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-[#8E9775]">100%</div>
                <p className="text-sm font-medium text-[#2D2D2D]/60 uppercase tracking-wider">Foco no bem-estar</p>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-[#8E9775]">+8 anos</div>
                <p className="text-sm font-medium text-[#2D2D2D]/60 uppercase tracking-wider">De experiência real</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4 pt-8">
              <div className="aspect-square rounded-3xl overflow-hidden bg-muted">
                <img src="https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=2071&auto=format&fit=crop" alt="Cuidado pet" className="w-full h-full object-cover" />
              </div>
              <div className="aspect-[3/4] rounded-3xl overflow-hidden bg-muted">
                <img src="https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=1964&auto=format&fit=crop" alt="Cão no banho" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="aspect-[3/4] rounded-3xl overflow-hidden bg-muted">
                <img src="https://images.unsplash.com/photo-1548191265-cc70d3d45ba1?q=80&w=2070&auto=format&fit=crop" alt="Brincadeira pet" className="w-full h-full object-cover" />
              </div>
              <div className="aspect-square rounded-3xl overflow-hidden bg-muted">
                <img src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=2043&auto=format&fit=crop" alt="Gato no pet shop" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Serviços */}
      <Section id="servicos" className="bg-[#FAF9F6]">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Cuidado completo para cada necessidade</h2>
          <p className="text-lg text-[#2D2D2D]/70">Oferecemos uma gama de serviços especializados com foco na saúde e no conforto do seu animal de estimação.</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { 
              title: "Estética & Higiene", 
              desc: "Banho, tosa higiênica e tosa da raça com produtos hipoalergênicos de alta qualidade.",
              icon: Scissors,
              items: ["Banho relaxante", "Tosa na máquina/tesoura", "Corte de unhas"]
            },
            { 
              title: "Centro de Cuidados", 
              desc: "Acompanhamento dedicado para garantir que seu pet esteja sempre saudável e feliz.",
              icon: ShieldCheck,
              items: ["Avaliação de pele e pelo", "Limpeza auricular", "Hidratação profunda"]
            },
            { 
              title: "Boutique & Acessórios", 
              desc: "Uma seleção curada de produtos, petiscos saudáveis e acessórios exclusivos.",
              icon: ShoppingBag,
              items: ["Brinquedos educativos", "Caminhas confortáveis", "Rações premium"]
            }
          ].map((service, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -8 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-black/5 flex flex-col h-full"
            >
              <div className="w-16 h-16 bg-[#8E9775]/10 rounded-2xl flex items-center justify-center mb-8">
                <service.icon className="w-8 h-8 text-[#4A5D23]" />
              </div>
              <h3 className="text-2xl font-bold mb-4">{service.title}</h3>
              <p className="text-[#2D2D2D]/70 mb-8 leading-relaxed">{service.desc}</p>
              <ul className="space-y-3 mt-auto">
                {service.items.map((item, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 text-[#8E9775]" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Diferenciais */}
      <Section id="diferenciais" className="bg-[#4A5D23] text-white">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-12">
            <h2 className="text-4xl md:text-6xl font-bold leading-tight">Por que confiar o seu melhor amigo à Pata & Cia?</h2>
            <div className="space-y-8">
              {[
                { 
                  title: "Ambiente Adaptado", 
                  desc: "Instalações modernas projetadas para reduzir o estresse animal durante o atendimento." 
                },
                { 
                  title: "Equipe Certificada", 
                  desc: "Profissionais treinados em comportamento animal e técnicas avançadas de tosa." 
                },
                { 
                  title: "Produtos Naturais", 
                  desc: "Utilizamos apenas shampoos e hidratantes com ingredientes naturais e biodegradáveis." 
                },
                { 
                  title: "Cuidado Individualizado", 
                  desc: "Respeitamos o tempo e o limite de cada animal, sem pressa e com muita paciência." 
                }
              ].map((item, i) => (
                <div key={i} className="flex gap-6">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">{item.title}</h3>
                    <p className="text-white/70 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative aspect-square">
            <div className="absolute inset-0 bg-white/5 rounded-full animate-pulse" />
            <img 
              src="https://images.unsplash.com/photo-1597673030062-0a0f1a801a31?q=80&w=2070&auto=format&fit=crop" 
              alt="Profissional cuidando de um cão" 
              className="w-full h-full object-cover rounded-[3rem] shadow-2xl relative z-10"
            />
          </div>
        </div>
      </Section>

      {/* Localização e Contato */}
      <Section id="contato" className="bg-white">
        <div className="grid lg:grid-cols-2 gap-16">
          <div className="space-y-10">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold tracking-tight">Venha nos visitar</h2>
              <p className="text-lg text-[#2D2D2D]/70">Estamos prontos para receber você e seu pet com todo o carinho.</p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#8E9775]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-[#4A5D23]" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Endereço</h3>
                  <p className="text-[#2D2D2D]/70">Rua dos Pets, 123 — Bairro Jardim</p>
                  <p className="text-[#2D2D2D]/70">Campina Grande, PB</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#8E9775]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-[#4A5D23]" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Horário de Funcionamento</h3>
                  <p className="text-[#2D2D2D]/70">Segunda a Sexta: 08:00 às 18:00</p>
                  <p className="text-[#2D2D2D]/70">Sábado: 08:00 às 13:00</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#8E9775]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-[#4A5D23]" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Fale Conosco</h3>
                  <p className="text-[#2D2D2D]/70">(83) 99999-0000</p>
                  <div className="flex gap-4 mt-4">
                    <Button variant="outline" size="icon" className="rounded-xl border-black/10">
                      <span className="text-[10px] font-bold">IG</span>
                    </Button>
                    <Button variant="outline" className="rounded-xl border-black/10 gap-2">
                      WhatsApp
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#FAF9F6] p-10 rounded-[3rem] border border-black/5 space-y-8 flex flex-col justify-center">
            <div className="space-y-4">
              <h3 className="text-3xl font-bold">Seu pet merece esse cuidado.</h3>
              <p className="text-[#2D2D2D]/70">Agende agora mesmo um horário para banho ou tosa e veja a diferença de um serviço premium.</p>
            </div>
            <Button size="lg" className="bg-[#4A5D23] hover:bg-[#3d4d1d] h-16 rounded-2xl text-lg w-full gap-3 group">
              Iniciar Agendamento
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <p className="text-xs text-center text-[#2D2D2D]/40 italic">
              * Esta é uma interface demonstrativa para fins comerciais.
            </p>
          </div>
        </div>
      </Section>

      {/* Personalização Mensagem */}
      <Section className="bg-[#F3F4F0] border-t border-black/5">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="w-12 h-12 bg-[#8E9775]/20 rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6 text-[#4A5D23]" />
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-[#2D2D2D]">Seu negócio não precisa seguir este modelo.</h2>
          <div className="space-y-6 text-xl text-[#2D2D2D]/70 leading-relaxed">
            <p>
              Esta experiência da <span className="text-[#4A5D23] font-semibold">Pata & Cia</span> é apenas um exemplo do que podemos construir juntos.
            </p>
            <p>
              O projeto do seu negócio será desenvolvido de forma exclusiva, alinhado à sua identidade visual, seus serviços, seu público e seus objetivos comerciais.
            </p>
          </div>
          <div className="pt-8">
             <div className="w-24 h-px bg-[#8E9775]/30 mx-auto mb-8" />
             <p className="text-sm tracking-widest uppercase text-[#2D2D2D]/50 font-bold">Experiência desenvolvida por Valtro Labs</p>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="bg-white py-12 px-6 border-t border-black/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#8E9775] rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-[#4A5D23]">PATA & CIA</span>
          </div>
          
          <div className="text-sm text-[#2D2D2D]/40">
            © 2026 Pata & Cia — Demonstração Comercial Valtro Labs. Todos os direitos reservados.
          </div>

          <div className="flex gap-6">
            <a href="#" className="text-sm text-[#2D2D2D]/60 hover:text-[#4A5D23]">Privacidade</a>
            <a href="#" className="text-sm text-[#2D2D2D]/60 hover:text-[#4A5D23]">Termos</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
