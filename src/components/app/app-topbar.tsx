import { Bell, Search } from "lucide-react";

/**
 * Topbar placeholder da área autenticada. Estrutura visual apenas.
 */
export function AppTopbar() {
  return (
    <header className="h-16 shrink-0 border-b border-border bg-background flex items-center gap-4 px-6">
      <div className="flex-1 max-w-md relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          placeholder="Buscar..."
          className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-surface text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <button
        type="button"
        aria-label="Notificações"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <Bell className="h-4 w-4" strokeWidth={1.75} />
      </button>
      <div className="h-9 w-9 rounded-full bg-brand-soft text-primary grid place-items-center text-sm font-semibold">
        V
      </div>
    </header>
  );
}
