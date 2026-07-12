import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section className="py-20 md:py-28">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-3xl bg-foreground text-background px-6 py-16 md:px-16 md:py-24 text-center">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at 30% 20%, oklch(0.55 0.22 265) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, oklch(0.5 0.2 258) 0%, transparent 50%)",
            }}
            aria-hidden
          />
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
              backgroundSize: "40px 40px",
              maskImage:
                "radial-gradient(ellipse at center, black 20%, transparent 70%)",
            }}
            aria-hidden
          />

          <div className="relative max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 backdrop-blur px-3 py-1.5 text-xs font-medium text-background/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Primeira solução já disponível
            </div>
            <h2 className="mt-6 text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
              Comece agora com o{" "}
              <span className="text-gradient-brand">Valtro Pricing</span>.
            </h2>
            <p className="mt-6 text-base md:text-lg text-background/70 max-w-xl mx-auto leading-relaxed">
              A primeira solução da Valtro Labs já está disponível. Precifique de
              forma inteligente, automatize regras e acompanhe a performance em
              tempo real.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://pricing.valtrolabs.pro"
                className="group inline-flex items-center gap-2 rounded-full bg-background text-foreground px-6 py-3.5 text-sm font-medium hover:opacity-90 transition-opacity"
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
