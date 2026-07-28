/**
 * Domínio: Produtos Acompanhados — Sprint 15.2.
 *
 * Decisões arquiteturais aprovadas:
 * - Vínculo ÚNICO por `project_id`. Cliente e contratação nunca são
 *   duplicados aqui; são derivados por join a partir do Projeto.
 * - `owner_id` é opcional. Quando nulo, o responsável operacional é o
 *   responsável do Projeto (herança LÓGICA — o valor jamais é copiado).
 * - Classificação e prioridade são `text` + CHECK no banco, mantendo a
 *   evolução aberta (novos valores ou tabela de domínio) sem migração
 *   destrutiva. Rótulos e cores vivem aqui, no front.
 */

export type TrackedProductStatus = "ativo" | "arquivado";
export type TrackedProductPriority = "baixa" | "media" | "alta";

/**
 * Conjunto atual da metodologia operacional da Valtro Labs.
 * Ao expandir: adicionar aqui + ampliar o CHECK no banco. Nenhum consumidor
 * deve assumir exaustividade fora dos mapas abaixo.
 */
export type TrackedProductClassification =
  | "escala"
  | "validacao"
  | "rentabilidade"
  | "liquidacao"
  | "organico"
  | "pausado";

export type TrackedProductEventType =
  | "criado"
  | "classificacao_alterada"
  | "prioridade_alterada"
  | "estoque_atualizado"
  | "custos_atualizados"
  | "objetivo_alterado"
  | "responsavel_alterado"
  | "arquivado"
  | "reativado"
  | "editado"
  | "observacao_adicionada";

export interface TrackedProduct {
  id: string;
  project_id: string;
  name: string;
  external_reference: string | null;
  classification: TrackedProductClassification;
  priority: TrackedProductPriority;
  objective: string | null;
  status: TrackedProductStatus;
  position: number;
  /** Nulo = herda o responsável do Projeto (não copiar o valor). */
  owner_id: string | null;
  product_cost_cents: number | null;
  packaging_cost_cents: number | null;
  taxes_cents: number | null;
  other_costs_cents: number | null;
  stock_quantity: number | null;
  restock_lead_time_days: number | null;
  operational_limitations: string | null;
  notes: string | null;
  archived_at: string | null;
  archived_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrackedProductEvent {
  id: string;
  tracked_product_id: string;
  project_id: string;
  event_type: TrackedProductEventType;
  title: string;
  description: string | null;
  metadata: Record<string, string | number | boolean | null>;
  actor_id: string | null;
  created_at: string;
}

export const CLASSIFICATION_ORDER: TrackedProductClassification[] = [
  "escala",
  "validacao",
  "rentabilidade",
  "liquidacao",
  "organico",
  "pausado",
];

export const CLASSIFICATION_LABEL: Record<TrackedProductClassification, string> = {
  escala: "Escala",
  validacao: "Validação",
  rentabilidade: "Rentabilidade",
  liquidacao: "Liquidação",
  organico: "Orgânico",
  pausado: "Pausado",
};

export const CLASSIFICATION_HINT: Record<TrackedProductClassification, string> = {
  escala: "Produto com tração — foco em ampliar volume.",
  validacao: "Em teste — ainda sem conclusão de desempenho.",
  rentabilidade: "Vende, mas exige ajuste de margem.",
  liquidacao: "Saída de estoque prioritária.",
  organico: "Mantido sem investimento em Ads.",
  pausado: "Fora da operação no momento.",
};

export const CLASSIFICATION_TONE: Record<TrackedProductClassification, string> = {
  escala: "bg-emerald-50 text-emerald-700 border-emerald-200",
  validacao: "bg-blue-50 text-blue-700 border-blue-200",
  rentabilidade: "bg-indigo-50 text-indigo-700 border-indigo-200",
  liquidacao: "bg-amber-50 text-amber-700 border-amber-200",
  organico: "bg-slate-50 text-slate-700 border-slate-200",
  pausado: "bg-rose-50 text-rose-700 border-rose-200",
};

export const PRIORITY_ORDER: TrackedProductPriority[] = ["alta", "media", "baixa"];

export const PRIORITY_LABEL: Record<TrackedProductPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export const PRIORITY_TONE: Record<TrackedProductPriority, string> = {
  baixa: "bg-slate-50 text-slate-600 border-slate-200",
  media: "bg-blue-50 text-blue-700 border-blue-200",
  alta: "bg-rose-50 text-rose-700 border-rose-200",
};

/** Fallback seguro para valores ainda não mapeados no front. */
export function classificationLabel(value: string): string {
  return (CLASSIFICATION_LABEL as Record<string, string>)[value] ?? value;
}

export function classificationTone(value: string): string {
  return (
    (CLASSIFICATION_TONE as Record<string, string>)[value] ??
    "bg-slate-50 text-slate-700 border-slate-200"
  );
}

/** Custo total unitário considerado na operação. Null quando nada informado. */
export function totalCostCents(
  p: Pick<
    TrackedProduct,
    "product_cost_cents" | "packaging_cost_cents" | "taxes_cents" | "other_costs_cents"
  >,
): number | null {
  const parts = [
    p.product_cost_cents,
    p.packaging_cost_cents,
    p.taxes_cents,
    p.other_costs_cents,
  ].filter((v): v is number => typeof v === "number");
  if (parts.length === 0) return null;
  return parts.reduce((a, b) => a + b, 0);
}

/**
 * Responsável efetivo: específico do produto quando definido, senão o do
 * Projeto. A herança é resolvida na leitura — nunca persistida.
 */
export function effectiveOwner(
  productOwnerId: string | null,
  productOwnerName: string | null,
  projectOwnerName: string | null,
): { name: string; inherited: boolean } {
  if (productOwnerId) {
    return { name: productOwnerName ?? "Responsável definido", inherited: false };
  }
  return { name: projectOwnerName ?? "—", inherited: true };
}
