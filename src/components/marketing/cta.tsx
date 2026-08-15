import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

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
              Primeira solução do ecossistema
            </div>
            <h2
              id="cta-title"
              className="mt-6 text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05] text-white text-balance"
            >
              Conheça a primeira solução do ecossistema Valtro Labs.
            </h2>
            <p className="mt-6 text-base md:text-lg text-white/80 max-w-xl mx-auto leading-relaxed">
              O Valtro Pricing inaugura o ecossistema Valtro Labs: precificação
              inteligente, regras automatizadas e visão de performance em tempo real —
              a base para as próximas soluções que estão por vir.
            </p>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
              <a
                href="https://pricing.valtrolabs.pro"
                className="group inline-flex items-center gap-2 rounded-lg bg-white text-brand-deep px-8 py-4 text-sm font-semibold hover:bg-white/95 transition-all duration-200 shadow-elevated hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              >
                Acessar gratuitamente
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </a>
              <Link
                to="/portfolio"
                className="group inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 text-white px-8 py-4 text-sm font-semibold hover:bg-white/20 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              >
                Ver Portfólio
                <Sparkles className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
