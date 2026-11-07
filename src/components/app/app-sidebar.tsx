import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/shared/logo";
import { OsNav } from "./os-nav";

export function AppSidebar() {
  return (
    <aside className="hidden md:flex md:w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-16 items-center px-6 border-b border-border">
        <Link to="/os/dashboard" className="flex items-center gap-3" aria-label="Valtro OS">
          <Logo variant="compact" />
        </Link>
      </div>
      <p className="px-6 pt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
        Valtro OS
      </p>

      <div className="flex-1 overflow-y-auto p-3">
        <OsNav />
      </div>
    </aside>
  );
}
