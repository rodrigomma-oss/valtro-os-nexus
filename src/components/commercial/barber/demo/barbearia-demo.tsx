import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Scissors, 
  Clock, 
  MapPin, 
  Phone, 
  ChevronRight, 
  Info, 
  Sparkles, 
  Star, 
  Users, 
  Layout, 
  Menu
} from "lucide-react";
import { cn } from "@/lib/utils";

const Section = ({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) => (
  <section id={id} className={cn("py-24 px-6 md:px-12", className)}>
    <div className="max-w-7xl mx-auto w-full">
      {children}
    </div>
  </section>
);

export function BarbeariaDemo() {
  return (
    <div className="min-h-screen bg-[#121212] text-[#E0E0E0] font-sans selection:bg-[#A67C00]/30">
      {/* Banner de Demonstração */}
      <div className="bg-[#A67C00] text-black py-2 px-4 text-center text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 sticky top-0 z-[60]">
        <Info className="w-3.5 h-3.5" />
        <span>Experiência demonstrativa • Valtro Labs</span>
      </div>

      {/* Header */}
      <header className="sticky top-12 mx-auto max-w-7xl z-50 px-6">
        <nav className="bg-[#1a1a1a]/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-white uppercase italic">Nobre</span>
            <span className="text-[10px] font-bold tracking-[0.3em] text-[#A67C00] uppercase -ml-1 mt-1">Barbearia</span>

          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#inicio" className="text-xs font-bold uppercase tracking-widest hover:text-[#A67C00] transition-colors">Início</a>
            <a href="#servicos" className="text-xs font-bold uppercase tracking-widest hover:text-[#A67C00] transition-colors">Serviços</a>
            <a href="#sobre" className="text-xs font-bold uppercase tracking-widest hover:text-[#A67C00] transition-colors">A Marca</a>
            <a href="#profissionais" className="text-xs font-bold uppercase tracking-widest hover:text-[#A67C00] transition-colors">Time</a>
            <a href="#estilo" className="text-xs font-bold uppercase tracking-widest hover:text-[#A67C00] transition-colors">Estilo</a>
            <a href="#contato" className="text-xs font-bold uppercase tracking-widest hover:text-[#A67C00] transition-colors">Local</a>

          </div>
          <Button className="bg-[#A67C00] hover:bg-[#856300] text-black font-bold uppercase tracking-wider rounded-none px-6">
            Agendar
          </Button>
        </nav>
      </header>

      {/* Hero */}
      <section id="inicio" className="pt-32 pb-20 px-6 md:px-12 relative min-h-[90vh] flex items-center">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1503951914875-452162b09f6f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-30" />
        <div className="max-w-7xl mx-auto relative z-10 grid lg:grid-cols-2 gap-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="space-y-8">
            <h1 className="text-6xl md:text-8xl font-serif font-medium leading-[0.9] text-white">
              Precisão.<br />Estilo.<br /><span className="text-[#A67C00]">Atitude.</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-lg leading-relaxed">
              Mais que um corte, uma marca registrada. Elevando o padrão da barbearia contemporânea com técnica e sofisticação.
            </p>
            <Button size="lg" className="bg-white text-black hover:bg-gray-200 rounded-none h-14 px-10 font-bold uppercase tracking-widest">
              Conhecer Serviços
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Sobre */}
      <Section id="sobre" className="bg-[#121212]">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <h2 className="text-4xl md:text-6xl font-serif text-white">A Nobre não segue tendências. Ela as define.</h2>
            <p className="text-lg text-gray-400 leading-relaxed">
              Nosso compromisso é com o detalhe. Em cada navalha, em cada lâmina, a busca incessante pelo acabamento perfeito que define um homem de verdade.
            </p>
          </div>
          <div className="aspect-[4/5] rounded-none overflow-hidden bg-white/5 relative">
            <img src="https://images.unsplash.com/photo-1599351431202-180f0b484589?q=80&w=2070&auto=format&fit=crop" alt="Barbearia" className="w-full h-full object-cover opacity-80" />
          </div>
        </div>
      </Section>

      {/* Serviços */}
      <Section id="servicos" className="bg-[#1a1a1a]">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-serif text-white uppercase tracking-tighter">O Ofício</h2>
          <div className="w-24 h-px bg-[#A67C00] mx-auto" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { title: "Corte Clássico", price: "R$ 90", desc: "Técnica em tesoura e máquina para um visual atemporal." },
            { title: "Barba Real", price: "R$ 70", desc: "Toalha quente, navalha e óleos essenciais." },
            { title: "Nobre Combo", price: "R$ 145", desc: "A experiência completa para o homem moderno." },
            { title: "Pigmentação", price: "R$ 60", desc: "Correção e definição de barba e cabelo." }
          ].map((s, i) => (
            <motion.div 
              key={i} 
              whileHover={{ y: -5 }}
              className="p-8 border border-white/5 bg-[#121212] transition-all hover:border-[#A67C00]/50 group flex flex-col justify-between h-full"
            >
              <div>
                <Scissors className="w-6 h-6 text-[#A67C00] mb-6 opacity-50 group-hover:opacity-100 transition-opacity" />
                <h3 className="text-xl font-serif text-white mb-2 uppercase tracking-wide">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">{s.desc}</p>
              </div>
              <p className="text-[#A67C00] font-bold tracking-widest text-lg">{s.price}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Profissionais */}
      <Section id="profissionais" className="bg-[#121212]">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 grid grid-cols-2 gap-4">
            {[
              { name: "Ricardo 'Nobre'", role: "Master Barber", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1974&auto=format&fit=crop" },
              { name: "Marco Silva", role: "Specialist", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1974&auto=format&fit=crop" }
            ].map((p, i) => (
              <div key={i} className="space-y-4 group">
                <div className="aspect-[3/4] overflow-hidden bg-white/5">
                  <img src={p.img} alt={p.name} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500 group-hover:scale-105" />
                </div>
                <div>
                  <h4 className="text-white font-bold uppercase tracking-widest text-sm">{p.name}</h4>
                  <p className="text-[#A67C00] text-[10px] font-bold uppercase tracking-[0.2em]">{p.role}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="order-1 lg:order-2 space-y-8">
            <h2 className="text-4xl md:text-6xl font-serif text-white uppercase leading-[0.9]">Mãos que <br /><span className="text-[#A67C00]">Esculpem.</span></h2>
            <p className="text-lg text-gray-400 leading-relaxed">
              Nossa equipe é formada por especialistas dedicados à arte da barbearia. Cada profissional traz consigo anos de técnica e um olhar apurado para a estética masculina.
            </p>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-3xl font-serif text-white">+15</p>
                <p className="text-[10px] text-[#A67C00] font-bold uppercase tracking-widest">Anos de Ofício</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <p className="text-3xl font-serif text-white">100%</p>
                <p className="text-[10px] text-[#A67C00] font-bold uppercase tracking-widest">Foco no Detalhe</p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Galeria / Estilo */}
      <Section id="estilo" className="bg-[#1a1a1a] p-0">
        <div className="grid grid-cols-2 md:grid-cols-4 aspect-[21/9]">
          {[
            "https://images.unsplash.com/photo-1512690196222-7c7d29900279?q=80&w=2070&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1593702288056-7927b442d0fa?q=80&w=2070&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1621605815841-aa3396568d8c?q=80&w=2070&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2074&auto=format&fit=crop"
          ].map((img, i) => (
            <div key={i} className="relative overflow-hidden group">
              <img src={img} alt="Galeria" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-[#A67C00]/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Scissors className="w-8 h-8 text-white" />
              </div>
            </div>
          ))}
        </div>
      </Section>


      {/* Localização e CTA */}
      <Section id="contato" className="bg-[#121212]">
        <div className="grid lg:grid-cols-2 gap-16">
          <div className="space-y-12">
            <h2 className="text-4xl font-serif text-white uppercase tracking-tighter">O QG</h2>
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <MapPin className="w-6 h-6 text-[#A67C00] mt-1" />
                <div>
                  <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-2">Endereço</h4>
                  <p className="text-gray-400">Rua da Precisão, 456 — Centro</p>
                  <p className="text-gray-400">Campina Grande, PB</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Clock className="w-6 h-6 text-[#A67C00] mt-1" />
                <div>
                  <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-2">Horários</h4>
                  <p className="text-gray-400">Seg — Sex: 09:00 - 20:00</p>
                  <p className="text-gray-400">Sáb: 09:00 - 18:00</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Phone className="w-6 h-6 text-[#A67C00] mt-1" />
                <div>
                  <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-2">Contato</h4>
                  <p className="text-gray-400">(83) 99999-0000</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-10 border-t-4 border-[#A67C00] bg-[#1a1a1a] shadow-2xl space-y-8 flex flex-col justify-center">
            <div className="space-y-4">
              <h3 className="text-3xl font-serif text-white uppercase tracking-tight">Ocupe a Cadeira</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Não deixe seu estilo para depois. Reserve seu horário agora e garanta a excelência que seu visual exige.</p>
            </div>
            <Button size="lg" className="w-full bg-white text-black hover:bg-gray-200 h-16 font-bold uppercase tracking-widest rounded-none group">
              Agendar Experiência
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform ml-2" />
            </Button>
            <p className="text-[10px] text-center text-gray-600 uppercase tracking-[0.2em]">
              * Interface demonstrativa • Valtro Labs
            </p>
          </div>
        </div>
      </Section>


      {/* Personalização */}
      <Section className="bg-[#1a1a1a] border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <Sparkles className="w-10 h-10 text-[#A67C00] mx-auto" />
          <h2 className="text-3xl font-serif text-white">Este é apenas um exemplo.</h2>
          <p className="text-gray-400">
            A presença digital da sua barbearia será desenhada de forma exclusiva, com a sua identidade visual e a estrutura que o seu negócio precisa.
          </p>
        </div>
      </Section>

      {/* Rodapé */}
      <footer className="py-12 text-center text-xs text-gray-600 uppercase tracking-widest">
        Nobre Barbearia © 2026 • Experiência demonstrativa by Valtro Labs
      </footer>
    </div>
  );
}
