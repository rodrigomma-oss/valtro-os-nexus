import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRoleName = "admin" | "operator" | "viewer";

/**
 * Papel do usuário autenticado — usado APENAS para alinhar a interface às
 * permissões existentes. A segurança real continua no banco (RLS/policies).
 */
export function useCurrentRole() {
  const query = useQuery({
    queryKey: ["current-user-roles"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<AppRoleName[]> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => r.role as AppRoleName);
    },
  });

  const roles = query.data ?? [];
  const isAdmin = roles.includes("admin");
  const isOperator = roles.includes("operator");
  // Enquanto os papéis carregam, assumimos leitura para não piscar ações.
  const isViewer = query.isSuccess && !isAdmin && !isOperator;

  return {
    roles,
    isLoading: query.isLoading,
    isAdmin,
    isOperator,
    isViewer,
    /** Pode executar ações de escrita operacionais (criar/editar/converter). */
    canWrite: isAdmin || isOperator,
    /** Pode executar ações administrativas (usuários, papéis, integrações). */
    canAdmin: isAdmin,
  };
}
