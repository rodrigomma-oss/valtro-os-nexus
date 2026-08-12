import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Gate de Autenticação e Autorização — Sprint 15.2.2B.
 * Valida a sessão do Supabase e a existência de um papel (role) no CRM.
 * `ssr: false` devido à persistência em localStorage.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
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
      // Usamos o queryClient do contexto para buscar as roles de forma eficiente.
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
        // Usuário autenticado mas sem role = Acesso Negado
        // Evitamos redirect se já estivermos no unauthorized
        if (location.pathname !== "/unauthorized") {
          throw redirect({ to: "/unauthorized" });
        }
      }
    } catch (e: any) {
      // Se for um redirect do TanStack, relançamos
      if (e?.isRedirect || e?.status === 301 || e?.status === 302 || e?.name === 'RedirectError') {
        throw e;
      }
      
      console.error("[AuthGate] Error checking roles:", e);
      if (location.pathname !== "/unauthorized") {
        throw redirect({ to: "/unauthorized" });
      }
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});
