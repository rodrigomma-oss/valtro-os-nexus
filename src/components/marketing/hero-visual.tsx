import { Activity, BarChart3, CircleDot, LineChart, Zap } from "lucide-react";

export function HeroVisual() {
  return (
    <div className="relative aspect-square w-full max-w-[560px] mx-auto">
      <div className="absolute inset-8 rounded-[2rem] bg-primary/10 blur-3xl" aria-hidden />

      <div className="absolute inset-0 rounded-3xl border border-border bg-surface shadow-elevated overflow-hidden">
        <div className="flex items-center gap-1.5 border-b border-border px-4 py-3 bg-background/60">
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="ml-3 text-[11px] text-muted-foreground font-mono">valtro.dashboard</span>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Receita total</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight text-foreground">R$ 284.520</div>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full bg-brand-soft text-primary px-2.5 py-1 text-xs font-medium">
              <Activity className="h-3 w-3" /> +12,4%
            </div>
          </div>

          <div className="relative h-32 rounded-xl border border-border bg-background/50 p-3">
            <svg viewBox="0 0 200 80" className="h-full w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#2563EB" stopOpacity="0.35" />
                  <stop offset="1" stopColor="#2563EB" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,60 L20,52 L40,58 L60,40 L80,44 L100,28 L120,32 L140,18 L160,24 L180,12 L200,16 L200,80 L0,80 Z"
                fill="url(#area)"
              />
              <path
                d="M0,60 L20,52 L40,58 L60,40 L80,44 L100,28 L120,32 L140,18 L160,24 L180,12 L200,16"
                fill="none"
                stroke="#2563EB"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {[
              { l: "Pedidos", v: "1.284", i: BarChart3 },
              { l: "Ticket", v: "R$ 221", i: LineChart },
              { l: "Ads ROI", v: "4,2x", i: Zap },
            ].map(({ l, v, i: Icon }) => (
              <div key={l} className="rounded-lg border border-border bg-background/60 p-3">
                <Icon className="h-3.5 w-3.5 text-primary" />
                <div className="mt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{l}</div>
                <div className="text-sm font-semibold tracking-tight text-foreground">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute -top-4 -right-4 sm:-right-8 rounded-xl border border-border bg-surface shadow-elevated p-3 pr-4 animate-float-slow">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-primary">
            <CircleDot className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Precificação</div>
            <div className="text-xs font-semibold tracking-tight text-foreground">+238 SKUs otimizados</div>
          </div>
        </div>
      </div>

      <div
        className="absolute -bottom-4 -left-4 sm:-left-8 rounded-xl border border-border bg-surface shadow-elevated p-3 pr-4 animate-float-slow"
        style={{ animationDelay: "1.5s" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Automação ativa</div>
            <div className="text-xs font-semibold tracking-tight text-foreground">32 regras · 4 marketplaces</div>
          </div>
        </div>
      </div>
    </div>
  );
}
