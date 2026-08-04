import React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { 
  FileText, 
  Key, 
  Play, 
  GitBranch, 
  AlertCircle, 
  Map, 
  History, 
  Activity, 
  ShieldCheck, 
  Code2, 
  BookOpen,
  ChevronRight,
  Search as SearchIcon,
  LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { title: "Introdução", href: "/api-docs", icon: BookOpen },
  { title: "Primeiros Passos", href: "/api-docs/getting-started", icon: Play },
  { title: "Autenticação", href: "/api-docs/authentication", icon: Key },
  { title: "Versionamento", href: "/api-docs/versioning", icon: GitBranch },
  { title: "Guia de Integração", href: "/api-docs/integration-guide", icon: ShieldCheck },
  { title: "OpenAPI Spec", href: "/api-docs/openapi", icon: Code2 },
  { title: "Pipeline", href: "/api-docs/pipeline", icon: Activity },
  { title: "Erros", href: "/api-docs/errors", icon: AlertCircle },
  { title: "Roadmap", href: "/api-docs/roadmap", icon: Map },
  { title: "Changelog", href: "/api-docs/changelog", icon: History },
  { title: "Status", href: "/api-docs/status", icon: ShieldCheck },
  { title: "Estratégia de SDK", href: "/api-docs/sdk-strategy", icon: Code2, badge: "Futuro" },
];

export function DevelopersLayout({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Mobile Topbar */}
      <div className="md:hidden fixed top-0 w-full h-14 border-b bg-background/80 backdrop-blur z-50 flex items-center px-4 justify-between">
        <Logo variant="compact" />
        <Button variant="ghost" size="icon">
          <ChevronRight className="rotate-90" />
        </Button>
      </div>

      {/* Sidebar */}
      <aside className="hidden md:flex w-72 flex-col border-r sticky top-0 h-screen bg-muted/30">
        <div className="h-16 flex items-center px-6 border-b shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <Logo variant="compact" />
            <span className="text-sm font-semibold tracking-tight">Developers</span>
          </Link>
        </div>

        <div className="p-4 border-b">
          <div className="relative group">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Pesquisar na documentação..." 
              className="pl-9 bg-background/50 border-muted focus-visible:ring-1"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-50">
              <kbd className="text-[10px] font-sans border rounded px-1.5">⌘</kbd>
              <kbd className="text-[10px] font-sans border rounded px-1.5">K</kbd>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 px-4 py-6">
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all group",
                    isActive 
                      ? "bg-primary/10 text-primary font-medium shadow-sm ring-1 ring-primary/20" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground")} />
                  <span className="flex-1 truncate">{item.title}</span>
                  {item.badge && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1 leading-none bg-muted/50 border-muted font-normal text-muted-foreground">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 pt-8 border-t space-y-4">
            <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
              Recursos
            </h4>
            <div className="space-y-1">
              <a href="/os/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
                <LayoutDashboard className="h-4 w-4" />
                <span>Console Valtro OS</span>
              </a>
            </div>
          </div>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pt-14 md:pt-0 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-10 md:px-12 md:py-16">
          {children}
        </div>
      </main>
    </div>
  );
}
