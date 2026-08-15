import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { NICHOS } from "@/modules/commercial/config";
import { PresentationLayout } from "@/layouts/presentation-layout";
import { PresentationProvider } from "@/modules/commercial/presentation-context";
import { NICHO_COMPONENTS } from "@/modules/commercial/presentation-registry";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const presentationSearchSchema = z.object({
  company: z.string(),
  city: z.string().optional(),
});

export const Route = createFileRoute("/apresentacao-viewer/$nicho")({
  validateSearch: (search) => presentationSearchSchema.parse(search),
  beforeLoad: async ({ location, context }) => {
    // 1. Validar autenticação (existência de sessão)
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/auth",
        search: { redirect: location.href },
      });
    }

    // 2. Validar autorização (existência de role no CRM)
    try {
      const roles = await context.queryClient.ensureQueryData({
        queryKey: ["my-roles", data.user.id],
        queryFn: async () => {
          const { data: rolesData, error: rolesError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id);
          
          if (rolesError) throw rolesError;
          return {
            roles: (rolesData ?? []).map(r => r.role),
          };
        },
        staleTime: 60_000,
      });

      if (!roles.roles || roles.roles.length === 0) {
        if (location.pathname !== "/unauthorized") {
          throw redirect({ to: "/unauthorized" });
        }
      }
    } catch (e: any) {
      if (e?.isRedirect || e?.status === 301 || e?.status === 302 || e?.name === 'RedirectError') {
        throw e;
      }
      if (location.pathname !== "/unauthorized") {
        throw redirect({ to: "/unauthorized" });
      }
    }

    return { user: data.user };
  },
  component: PresentationViewerPage,
});

function PresentationViewerPage() {
  const { nicho: nichoId } = Route.useParams();
  const { company, city } = Route.useSearch();
  const [showToolbar, setShowToolbar] = useState(true);
  
  const nicho = NICHOS.find(n => n.id === nichoId) || NICHOS[0];
  const PresentationComponent = NICHO_COMPONENTS[nichoId] || NICHO_COMPONENTS.placeholder;

  return (
    <PresentationProvider empresa={company} cidade={city}>
      <PresentationLayout themeClass={nicho.themeClass}>
        <div className="relative min-h-screen">
          {/* Barra de Ferramentas da Apresentação (Flutuante e Minimamente Invasiva) */}
          <header className={cn(
            "fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2 bg-background/60 backdrop-blur-xl border border-border/40 rounded-full shadow-elevated transition-all duration-500 print:hidden",
            !showToolbar && "-top-20 opacity-0"
          )}>
            <Button variant="ghost" size="sm" asChild className="h-8 rounded-full gap-2 px-3 text-xs">
              <Link to="/os/comercial/apresentacoes">
                <ArrowLeft className="h-3 w-3" />
                Sair
              </Link>
            </Button>
            <div className="h-4 w-px bg-border/40" />
            <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-2">
              {nicho.label}
            </div>
            <div className="h-4 w-px bg-border/40" />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full" 
              onClick={() => setShowToolbar(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </header>

          {/* Toggle para mostrar barra se oculta */}
          {!showToolbar && (
            <button 
              onClick={() => setShowToolbar(true)}
              className="fixed top-0 left-0 right-0 h-4 z-[100] group flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
            >
              <div className="w-12 h-1 bg-accent/40 rounded-full mt-1" />
            </button>
          )}

          <PresentationComponent />
        </div>
      </PresentationLayout>
    </PresentationProvider>
  );
}
