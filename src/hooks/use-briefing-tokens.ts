/**
 * Hooks TanStack Query para o domínio Valtro Briefing Engine (VBE).
 * Sprint 2B.3.1: preparação. Não consumidos por nenhuma UI ainda.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  generateBriefingToken,
  listLeadBriefingTokens,
  resendBriefingToken,
  revokeBriefingToken,
} from "@/lib/briefing.functions";
import type { BriefingToken, ServiceType, TemplateType } from "@/types/briefing";

export const briefingKeys = {
  all: ["briefing"] as const,
  tokensByLead: (leadId: string) => ["briefing", "tokens", leadId] as const,
};

export function useLeadBriefingTokens(leadId: string | undefined) {
  const list = useServerFn(listLeadBriefingTokens);
  return useQuery<BriefingToken[]>({
    queryKey: briefingKeys.tokensByLead(leadId ?? ""),
    queryFn: () => list({ data: { lead_id: leadId! } }),
    enabled: !!leadId,
  });
}

export function useGenerateBriefingToken() {
  const qc = useQueryClient();
  const generate = useServerFn(generateBriefingToken);
  return useMutation({
    mutationFn: (input: {
      lead_id: string;
      service_type: ServiceType;
      template_type?: TemplateType;
      ttl_days?: number;
    }) => generate({ data: input }),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: briefingKeys.tokensByLead(vars.lead_id) });
    },
  });
}

export function useRevokeBriefingToken(leadId: string) {
  const qc = useQueryClient();
  const revoke = useServerFn(revokeBriefingToken);
  return useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: briefingKeys.tokensByLead(leadId) });
    },
  });
}

export function useResendBriefingToken(leadId: string) {
  const qc = useQueryClient();
  const resend = useServerFn(resendBriefingToken);
  return useMutation({
    mutationFn: (input: { id: string; ttl_days?: number }) =>
      resend({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: briefingKeys.tokensByLead(leadId) });
    },
  });
}
