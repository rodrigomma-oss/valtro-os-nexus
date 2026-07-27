/**
 * Onboarding concluído → `project_operations` — Sprint 15.1.1.
 *
 * Regra explícita e segura de escrita: o onboarding só PREENCHE LACUNAS.
 * Nenhum campo já definido pelo operador é sobrescrito automaticamente.
 * Assim a resposta do cliente acelera o start da operação sem apagar decisão
 * interna. Os produtos NÃO são migrados aqui — permanecem preservados no
 * onboarding até a Sprint 15.2 criar "Produtos Acompanhados".
 *
 * Módulo puro (sem I/O) para ser testável de forma determinística.
 */
import type { ProjectOperations } from "@/types/project-operations";

/**
 * Converte texto monetário informado pelo cliente em centavos.
 * Aceita "R$ 1.500,00", "1500", "1.500", "1500.50", "R$ 1 500,00".
 * Retorna `null` quando não há número reconhecível.
 */
export function parseCurrencyToCents(input: unknown): number | null {
  if (typeof input !== "string") return null;
  const cleaned = input.replace(/[^\d.,-]/g, "").trim();
  if (!cleaned || /-/.test(cleaned)) return null;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized = cleaned;

  if (hasComma && hasDot) {
    // Formato pt-BR: ponto é milhar, vírgula é decimal.
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    const decimals = cleaned.split(",")[1] ?? "";
    // "1,5" e "1,50" são decimais; "1,500" é separador de milhar.
    normalized = decimals.length === 3 ? cleaned.replace(",", "") : cleaned.replace(",", ".");
  } else if (hasDot) {
    const decimals = cleaned.split(".").pop() ?? "";
    normalized = decimals.length === 3 ? cleaned.replace(/\./g, "") : cleaned;
  }

  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/** "1".."5" → 1..5. "sem_preferencia" e valores fora da faixa → null. */
export function parseMeetingWeekday(input: unknown): number | null {
  if (typeof input !== "string") return null;
  if (!/^[0-6]$/.test(input.trim())) return null;
  return Number(input.trim());
}

export interface OperationsPatch {
  ads_monthly_budget_cents?: number;
  ads_autonomy_limit_cents?: number;
  meeting_weekday?: number;
  notes?: string;
}

/**
 * Deriva o patch de `project_operations` a partir das respostas do onboarding.
 * `current` são os valores já existentes: qualquer campo não nulo é mantido.
 */
export function operationsPatchFromOnboarding(
  answers: Record<string, unknown>,
  current: Pick<
    ProjectOperations,
    "ads_monthly_budget_cents" | "ads_autonomy_limit_cents" | "meeting_weekday" | "notes"
  > | null,
): OperationsPatch {
  const patch: OperationsPatch = {};

  const budget = parseCurrencyToCents(answers.ads_orcamento_mensal);
  if (budget !== null && (current?.ads_monthly_budget_cents ?? null) === null) {
    patch.ads_monthly_budget_cents = budget;
  }

  const autonomy = parseCurrencyToCents(answers.ads_limite_autonomia);
  if (autonomy !== null && (current?.ads_autonomy_limit_cents ?? null) === null) {
    patch.ads_autonomy_limit_cents = autonomy;
  }

  const weekday = parseMeetingWeekday(answers.reuniao_dia);
  if (weekday !== null && (current?.meeting_weekday ?? null) === null) {
    patch.meeting_weekday = weekday;
  }

  const notes = typeof answers.observacoes_operacionais === "string"
    ? answers.observacoes_operacionais.trim()
    : "";
  const horario = typeof answers.reuniao_horario === "string" ? answers.reuniao_horario.trim() : "";
  const composed = [
    horario ? `Melhor horário informado no onboarding: ${horario}.` : "",
    notes,
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 1000);
  if (composed && (current?.notes ?? null) === null) {
    patch.notes = composed;
  }

  return patch;
}
