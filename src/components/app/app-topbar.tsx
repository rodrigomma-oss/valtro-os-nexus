import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, Search, LogOut, User as UserIcon, Settings, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { OsNav } from "./os-nav";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { clearSessionMarkers } from "@/lib/session";


export interface AppTopbarProps {
  breadcrumb?: ReactNode;
}

/**
 * Topbar definitiva do painel autenticado.
 * Esquerda: slot de breadcrumb (renderizado pela página).
 * Direita: busca global, notificações, avatar/menu do usuário.
 */
export function AppTopbar({ breadcrumb }: AppTopbarProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      const meta = data.user?.user_metadata as { full_name?: string; name?: string } | undefined;
      setFullName(meta?.full_name ?? meta?.name ?? null);
    });
  }, []);

  const initials = (fullName ?? email ?? "VL")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "VL";

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    clearSessionMarkers();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="h-16 shrink-0 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 flex items-center gap-4 px-4 md:px-6">
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0"
            aria-label="Abrir navegação"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 bg-surface">
          <SheetHeader className="h-16 justify-center border-b border-border px-6">
            <SheetTitle className="text-left text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Valtro OS
            </SheetTitle>
          </SheetHeader>
          <div className="p-3 overflow-y-auto">
            <OsNav onNavigate={() => setNavOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1 min-w-0 flex items-center gap-4">
        <div className="min-w-0 hidden md:block">{breadcrumb}</div>
        <span className="md:hidden text-sm font-semibold text-foreground">Valtro OS</span>
      </div>


      <div className="relative w-full max-w-xs hidden lg:block">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          strokeWidth={1.75}
        />
        <Input
          type="search"
          placeholder="Buscar leads, clientes..."
          className="pl-9 h-10 bg-surface"
          aria-label="Pesquisa global"
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="relative shrink-0"
        aria-label="Notificações"
      >
        <Bell className="h-4 w-4" strokeWidth={1.75} />
        <Badge
          className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] font-semibold bg-primary text-primary-foreground border-2 border-background"
          variant="default"
        >
          3
        </Badge>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-3 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-opacity hover:opacity-90"
            aria-label="Menu do usuário"
          >
            <Avatar className="h-9 w-9 border border-border">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden xl:flex flex-col items-start leading-tight">
              <span className="text-sm font-medium text-foreground">
                {fullName ?? "Minha conta"}
              </span>
              <span className="text-xs text-muted-foreground">
                {email ?? ""}
              </span>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <UserIcon className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Perfil
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Settings className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Preferências
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
