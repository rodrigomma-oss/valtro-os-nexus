import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, FileText, Settings } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/crm/dashboard", icon: LayoutDashboard },
  { label: "Leads", to: "/crm/leads", icon: Users },
  { label: "Briefing", to: "/briefing", icon: FileText },
  { label: "Admin", to: "/admin", icon: Settings },
] as const;

/**
 * Sidebar placeholder do painel autenticado (CRM/Admin).
 * Estrutura visual apenas — sem lógica de permissões nesta sprint.
 */
export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden md:flex md:w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-16 items-center px-6 border-b border-border">
        <Logo variant="compact" />
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-soft text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
