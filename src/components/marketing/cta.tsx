import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section className="py-20 md:py-28">
      <div className="container-page">
        <div
          className="relative overflow-hidden rounded-3xl px-6 py-16 md:px-16 md:py-24 text-center"
          style={{
            background:
              "linear-gradient(135deg, #0B1F5E 0%, #1D4ED8 60%, #2563EB 100%)",
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage:
                "radial-gradient(ellipse at center, black 20%, transparent 70%)",
            }}
            aria-hidden
          />

          <div className="relative max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur px-3.5 py-1.5 text-xs font-medium text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Primeira solução já disponível
            </div>
            <h2 className="mt-6 text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05] text-white">
              Comece agora com o Valtro Pricing.
            </h2>
            <p className="mt-6 text-base md:text-lg text-white/75 max-w-xl mx-auto leading-relaxed">
              A primeira solução da Valtro Labs já está disponível. Precifique de
              forma inteligente, automatize regras e acompanhe a performance em
              tempo real.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://pricing.valtrolabs.pro"
                className="group inline-flex items-center gap-2 rounded-lg bg-white text-[#0B1F5E] px-7 py-3.5 text-sm font-semibold hover:bg-white/90 transition-colors shadow-elevated"
              >
                Acessar gratuitamente
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
