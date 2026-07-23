import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section aria-labelledby="cta-title" className="py-20 md:py-28">
      <div className="container-page">
        <div
          className="relative overflow-hidden rounded-3xl px-6 py-16 md:px-16 md:py-24 text-center shadow-elevated"
          style={{
            background:
              "linear-gradient(135deg, var(--brand-deep) 0%, var(--primary-hover) 60%, var(--primary) 100%)",
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
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 backdrop-blur px-3.5 py-1.5 text-xs font-medium text-white">
              <span className="relative flex h-1.5 w-1.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300/70 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Primeira solução já disponível
            </div>
            <h2
              id="cta-title"
              className="mt-6 text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05] text-white text-balance"
            >
              Comece agora com o Valtro Pricing.
            </h2>
            <p className="mt-6 text-base md:text-lg text-white/80 max-w-xl mx-auto leading-relaxed">
              A primeira solução da Valtro Labs já está disponível. Precifique de
              forma inteligente, automatize regras e acompanhe a performance em
              tempo real.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://pricing.valtrolabs.pro"
                className="group inline-flex items-center gap-2 rounded-lg bg-white text-brand-deep px-7 py-3.5 text-sm font-semibold hover:bg-white/90 transition-colors shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              >
                Acessar gratuitamente
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
