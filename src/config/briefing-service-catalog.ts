/**
 * Catálogo oficial de Serviços apresentados ao operador ao gerar um
 * novo Briefing (Sprint 2C.2).
 *
 * A UI referencia SEMPRE `service_type` (enum do banco). O Template
 * correspondente é resolvido no servidor via `templateTypeForService`
 * — o operador NUNCA escolhe Template.
 */
import type { ServiceType } from "@/types/briefing";

export interface BriefingServiceOption {
  value: Exclude<ServiceType, "nao_definido">;
  label: string;
  description?: string;
}

export const BRIEFING_SERVICE_CATALOG: BriefingServiceOption[] = [
  {
    value: "desenvolvimento_projeto",
    label: "Desenvolvimento de Projeto",
    description: "Projeto sob medida, site, plataforma ou operação nova.",
  },
  {
    value: "diagnostico",
    label: "Diagnóstico / Otimização de Loja",
    description: "Análise consultiva e melhorias na operação atual.",
  },
  {
    value: "consultoria",
    label: "Consultoria",
    description: "Acompanhamento estratégico contínuo.",
  },
  {
    value: "gestao_shopee",
    label: "Gestão Shopee",
  },
  {
    value: "gestao_mercadolivre",
    label: "Gestão Mercado Livre",
  },
  {
    value: "gestao_amazon",
    label: "Gestão Amazon",
  },
  {
    value: "gestao_multicanal",
    label: "Gestão Multicanal",
  },
  {
    value: "trafego_pago",
    label: "Tráfego Pago",
  },
  {
    value: "outro",
    label: "Outro",
    description: "Necessidade fora do catálogo padrão.",
  },
];

export function briefingServiceLabel(v: ServiceType): string {
  return (
    BRIEFING_SERVICE_CATALOG.find((s) => s.value === v)?.label ??
    "Não definido"
  );
}
