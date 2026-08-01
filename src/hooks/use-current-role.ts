import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRoles } from "@/lib/leads.functions";

/**
 * Papéis do usuário autenticado — reutiliza a server function existente
 * `getMyRoles`. Usado APENAS para alinhar a interface às permissões atuais;
 * a segurança real continua no banco (RLS/policies).
 */
export function useCurrentRole() {
  const rolesFn = useServerFn(getMyRoles);
  const query = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => rolesFn(),
    staleTime: 5 * 60 * 1000,
  });

  return {
    isLoading: query.isLoading,
    isAdmin: query.data?.isAdmin ?? false,
    canWrite: query.data?.canWrite ?? false,
    canAdmin: query.data?.isAdmin ?? false,
  };
}
