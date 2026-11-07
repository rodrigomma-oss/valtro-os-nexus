import { Link, useRouterState } from "@tanstack/react-router";
import { OS_NAV_GROUPS, type NavItem } from "./os-nav-config";
import { useCurrentRole } from "@/hooks/use-current-role";
import { cn } from "@/lib/utils";

export interface OsNavProps {
  /** Chamado ao navegar — usado pelo drawer mobile para fechar. */
  onNavigate?: () => void;
  className?: string;
}

/**
 * Lista de navegação do Valtro OS — compartilhada entre a sidebar desktop
 * e o drawer mobile. Não contém regra de negócio.
 */
export function OsNav({ onNavigate, className }: OsNavProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { canAdmin, isLoading } = useCurrentRole();

  const isActive = (item: NavItem) =>
    !item.external && (pathname === item.to || pathname.startsWith(`${item.to}/`));

  const renderItem = (item: NavItem) => {
    const active = isActive(item);
    const classes = cn(
      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
      active
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-accent hover:text-foreground",
    );

    const content = (
      <>
        <item.icon
          className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110"
          strokeWidth={1.75}
        />
        <span className="truncate">{item.label}</span>
      </>
    );

    if (item.external) {
      return (
        <a
          key={item.to}
          href={item.to}
          target="_blank"
          rel="noreferrer"
          className={classes}
          onClick={onNavigate}
        >
          {content}
        </a>
      );
    }

    return (
      <Link key={item.to} to={item.to} className={classes} onClick={onNavigate}>
        {content}
      </Link>
    );
  };

  return (
    <nav className={cn("flex flex-col gap-4", className)} aria-label="Navegação do Valtro OS">
      {OS_NAV_GROUPS.map((group) => {
        const items = group.items.filter(
          (item) => !item.adminOnly || canAdmin || isLoading,
        );
        if (items.length === 0) return null;
        return (
          <div key={group.label} className="space-y-1">
            <p className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              {group.label}
            </p>
            {items.map(renderItem)}
          </div>
        );
      })}
    </nav>
  );
}
