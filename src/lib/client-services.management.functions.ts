/**
 * Fase 1A — listagem de contratações para a gestão do ciclo de vida do
 * cliente (encerramento + status do cliente).
 *
 * Reaproveita o grafo de transições já existente
 * (`src/lib/client-service-transitions.ts`) e os status do banco
 * (`pendente`, `ativo`, `pausado`, `concluido`, `cancelado`).
 *
 * Nenhuma duplicidade de estrutura é criada: apenas uma leitura simples das
 * contratações do cliente com o campo de encerramento já previsto pela
 * migração `fase1a_encerramento_contratacoes` (quando aplicada).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isTransitionAllowed } from "@/lib/client-service-transitions";
import {
  TERMINATION_REASON_TARGET,
  TERMINATION_REASONS,
} from "@/types/client-service";
import type { ClientServiceStatus, TerminationReason } from "@/types/client-service";

export { ONGOING_SERVICE_STATUSES as ONGOING_CLIENT_SERVICE_STATUSES } from "@/types/client-service";

export interface ManagedClientService {
  id: string;
  name: string;
  status: ClientServiceStatus;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  termination_reason: TerminationReason | null;
  termination_note: string | null;
  terminated_at: string | null;
  terminated_by: string | null;
  canTerminate: boolean;
}

export const listManagedClientServices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ clientId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<ManagedClientService[]> => {
    const { supabase } = context;

    const { data: rows, error } = await supabase
      .from("client_services")
      .select("*")
      .eq("client_id", data.clientId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const services = (rows ?? []) as unknown as Array<Record<string, unknown>>;

    return services.map((row) => {
      const status = (row.status ?? "pendente") as ClientServiceStatus;
      const canTerminate = TERMINATION_REASONS.some((reason) =>
        isTransitionAllowed(status, TERMINATION_REASON_TARGET[reason]),
      );
      return {
        id: String(row.id),
        name: (row.name_snapshot as string | null) ?? "Contratação",
        status,
        started_at: (row.started_at as string | null) ?? null,
        completed_at: (row.completed_at as string | null) ?? null,
        cancelled_at: (row.cancelled_at as string | null) ?? null,
        termination_reason:
          (row.termination_reason as TerminationReason | null) ?? null,
        termination_note: (row.termination_note as string | null) ?? null,
        terminated_at: (row.terminated_at as string | null) ?? null,
        terminated_by: (row.terminated_by as string | null) ?? null,
        canTerminate,
      };
    });
  });
