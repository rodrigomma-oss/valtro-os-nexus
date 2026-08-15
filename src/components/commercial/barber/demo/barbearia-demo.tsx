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
            <span className="text-xl font-bold tracking-tight text-white uppercase">Nobre</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#inicio" className="text-xs font-bold uppercase tracking-widest hover:text-[#A67C00] transition-colors">Início</a>
            <a href="#servicos" className="text-xs font-bold uppercase tracking-widest hover:text-[#A67C00] transition-colors">Serviços</a>
            <a href="#sobre" className="text-xs font-bold uppercase tracking-widest hover:text-[#A67C00] transition-colors">A Marca</a>
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
          <h2 className="text-4xl md:text-5xl font-serif text-white">Serviços</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: "Corte de Cabelo", price: "R$ 90" },
            { title: "Barba Real", price: "R$ 70" },
            { title: "Experiência Nobre (Corte + Barba)", price: "R$ 150" }
          ].map((s, i) => (
            <div key={i} className="p-8 border border-white/10 hover:border-[#A67C00] transition-colors group">
              <h3 className="text-2xl font-serif text-white mb-4">{s.title}</h3>
              <p className="text-[#A67C00] font-bold tracking-widest">{s.price}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Localização e CTA */}
      <Section id="contato" className="bg-[#121212]">
        <div className="grid lg:grid-cols-2 gap-16">
          <div className="space-y-8">
            <h2 className="text-4xl font-serif text-white">Localização</h2>
            <div className="space-y-4 text-gray-400">
              <p>Rua da Precisão, 456 — Centro</p>
              <p>(83) 99999-0000</p>
            </div>
          </div>
          <div className="p-10 border-t-4 border-[#A67C00] bg-white/5 space-y-6">
            <h3 className="text-2xl font-serif text-white">Agende sua visita</h3>
            <Button className="w-full bg-[#A67C00] text-black h-14 font-bold uppercase tracking-widest">
              Reservar Horário
            </Button>
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
