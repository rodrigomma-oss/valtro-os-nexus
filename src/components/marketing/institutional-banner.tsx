import { Sparkles } from "lucide-react";

export function InstitutionalBanner() {
  return (
    <section aria-labelledby="banner-title" className="py-20 md:py-24">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-8 md:p-14 shadow-soft">
          <div
            className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl pointer-events-none"
            aria-hidden
          />
          <div
            className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-brand-deep/5 blur-3xl pointer-events-none"
            aria-hidden
          />
          <div className="relative flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-elevated">
              <Sparkles className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            </div>
            <div className="flex-1">
              <p className="eyebrow">Aviso institucional</p>
              <p
                id="banner-title"
                className="mt-3 text-xl md:text-2xl font-medium tracking-tight text-foreground leading-snug text-balance"
              >
                Estamos construindo um ecossistema completo de soluções para
                vendedores em marketplaces. O{" "}
                <span className="text-primary font-semibold">Valtro Pricing</span> é
                apenas o primeiro passo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
