import { Sparkles } from "lucide-react";

export function InstitutionalBanner() {
  return (
    <section className="py-16 md:py-20">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-8 md:p-12">
          <div
            className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand/10 blur-3xl pointer-events-none"
            aria-hidden
          />
          <div className="relative flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-foreground text-background">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-brand">
                Aviso institucional
              </div>
              <p className="mt-3 text-xl md:text-2xl font-medium tracking-tight text-foreground leading-snug">
                Estamos construindo um ecossistema completo de soluções para
                negócios digitais. O{" "}
                <span className="text-gradient-brand">Valtro Pricing</span> é
                apenas o primeiro passo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
