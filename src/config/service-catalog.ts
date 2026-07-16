/**
 * Catálogo de serviços apresentado ao operador no CRM.
 *
 * Este catálogo é DESACOPLADO da enum `service_type` do banco (ADR-008 —
 * taxonomia transitória). A UI referencia apenas os `id`s deste arquivo;
 * quando a taxonomia evoluir, basta ajustar o mapeamento `dbValue`.
 */
import type { ServiceType } from "@/types/briefing";

export interface ServiceOption {
  /** ID estável para a UI. Não muda mesmo se a enum evoluir. */
  id: string;
  /** Rótulo exibido ao operador. */
  label: string;
  /** Descrição curta (opcional). */
  description?: string;
  /** Valor persistido no banco (enum service_type). */
  dbValue: ServiceType;
}

export const SERVICE_CATALOG: ServiceOption[] = [
  {
    id: "analise_loja",
    label: "Análise de Loja",
    description: "Diagnóstico consultivo da operação atual.",
    dbValue: "diagnostico",
  },
  {
    id: "otimizacao_loja",
    label: "Otimização de Loja",
    description: "Ajustes e melhorias na performance da loja.",
    dbValue: "gestao_multicanal",
  },
  {
    id: "projeto_digital",
    label: "Projeto Digital",
    description: "Projeto sob medida, tráfego e presença digital.",
    dbValue: "trafego_pago",
  },
  {
    id: "consultoria",
    label: "Consultoria",
    description: "Acompanhamento estratégico contínuo.",
    dbValue: "consultoria",
  },
  {
    id: "outro",
    label: "Outro",
    description: "Necessidade fora do catálogo padrão.",
    dbValue: "outro",
  },
];

/** Traduz o valor persistido para o rótulo amigável da UI. */
export function labelForDbValue(v: ServiceType): string {
  return SERVICE_CATALOG.find((s) => s.dbValue === v)?.label ?? "Não definido";
}

/** Traduz um id da UI para o valor a persistir. */
export function dbValueForId(id: string): ServiceType {
  return SERVICE_CATALOG.find((s) => s.id === id)?.dbValue ?? "nao_definido";
}
