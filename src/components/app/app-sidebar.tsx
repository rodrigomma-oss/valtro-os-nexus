import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  FileSignature,
  Building2,
  Settings,
  ClipboardList,
  FolderKanban,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  disabled?: boolean;
  external?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operação",
    items: [
      { label: "Centro de Operações", to: "/crm/dashboard", icon: LayoutDashboard },
      { label: "Leads", to: "/crm/leads", icon: Users },
      { label: "Clientes", to: "/crm/clientes", icon: Building2 },
      { label: "Projetos", to: "/crm/projetos", icon: FolderKanban },
    ],
  },
  {
    label: "Ferramentas",
    items: [
      { label: "Portal de Diagnóstico", to: "/diagnostico", icon: ClipboardList, external: true },
    ],
  },
  {
    label: "Em breve",
    items: [
      { label: "Análises", to: "/crm/analises", icon: BarChart3, disabled: true },
      { label: "Propostas", to: "/crm/propostas", icon: FileSignature, disabled: true },
    ],
  },
];

const NAV_FOOTER: NavItem[] = [
  { label: "Configurações", to: "/crm/configuracoes", icon: Settings, disabled: true },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const renderItem = (item: NavItem) => {
    const active =
      !item.disabled && (pathname === item.to || pathname.startsWith(`${item.to}/`));

    const baseClasses = cn(
      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
      active
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-accent hover:text-foreground",
      item.disabled &&
        "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-muted-foreground",
    );

    const content = (
      <>
        <item.icon
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            !item.disabled && "group-hover:scale-110",
          )}
          strokeWidth={1.75}
        />
        <span className="truncate">{item.label}</span>
        {item.disabled && (
          <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground/70">
            em breve
          </span>
        )}
      </>
    );

    if (item.disabled) {
      return (
        <div key={item.to} className={baseClasses} aria-disabled="true">
          {content}
        </div>
      );
    }

    if (item.external) {
      return (
        <a
          key={item.to}
          href={item.to}
          target="_blank"
          rel="noreferrer"
          className={baseClasses}
        >
          {content}
        </a>
      );
    }

    return (
      <Link key={item.to} to={item.to} className={baseClasses}>
        {content}
      </Link>
    );
  };

  return (
    <aside className="hidden md:flex md:w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-16 items-center px-6 border-b border-border">
        <Link to="/crm/dashboard" className="flex items-center">
          <Logo variant="compact" />
        </Link>
      </div>

      <nav className="flex-1 flex flex-col p-3 gap-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              {group.label}
            </p>
            {group.items.map(renderItem)}
          </div>
        ))}

        <div className="mt-auto space-y-1 pt-4 border-t border-border">
          {NAV_FOOTER.map(renderItem)}
        </div>
      </nav>
    </aside>
  );
}
