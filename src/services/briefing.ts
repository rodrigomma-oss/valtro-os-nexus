/**
 * Camada de serviços do Valtro Briefing Engine (VBE).
 *
 * Wrappers finos sobre as Server Functions para consumo consistente
 * pelos hooks TanStack Query. Mantém a interface do domínio isolada
 * do transporte (server function), facilitando testes e evolução.
 */
import {
  generateBriefingToken,
  listLeadBriefingTokens,
  resendBriefingToken,
  revokeBriefingToken,
  validateBriefingToken,
} from "@/lib/briefing.functions";
import type { ServiceType, TemplateType } from "@/types/briefing";

export const briefingService = {
  list: (lead_id: string) => listLeadBriefingTokens({ data: { lead_id } }),
  generate: (input: {
    lead_id: string;
    service_type: ServiceType;
    template_type?: TemplateType;
    ttl_days?: number;
  }) => generateBriefingToken({ data: input }),
  revoke: (id: string) => revokeBriefingToken({ data: { id } }),
  resend: (id: string, ttl_days?: number) =>
    resendBriefingToken({ data: { id, ttl_days } }),
  validate: (token: string) => validateBriefingToken({ data: { token } }),
};
