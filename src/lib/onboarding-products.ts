/**
 * Produtos informados no onboarding — Sprint 15.1.1.
 *
 * Estrutura intencionalmente simples e estável: uma lista de itens dentro do
 * JSONB de respostas do onboarding (`onboarding_responses.data.produtos`).
 *
 * Por que aqui e não em uma tabela nova: a Sprint 15.2 criará a entidade
 * operacional "Produtos Acompanhados". Manter o formato normalizado e
 * previsível permite migrar esses itens sem pedir nada de novo ao cliente.
 *
 * Este módulo é puro (sem I/O) para ser usado tanto no portal público quanto
 * na sanitização server-side, com o mesmo contrato.
 */

export interface OnboardingProductItem {
  /** Nome do produto conforme o cliente identifica internamente. */
  nome: string;
  /** Custo unitário de aquisição, texto livre ("R$ 18,90"). */
  custo_unitario: string;
  /** Estoque aproximado. */
  estoque: string;
  /** Prazo médio de reposição. */
  prazo_reposicao: string;
  /** Limitação de fornecimento, quando houver. */
  limitacao_fornecimento: string;
  /** Observação opcional. */
  observacao: string;
}

export const PRODUCT_FIELDS = [
  "nome",
  "custo_unitario",
  "estoque",
  "prazo_reposicao",
  "limitacao_fornecimento",
  "observacao",
] as const;

/** Limites defensivos de tamanho — evitam payload abusivo no portal anônimo. */
const MAX_LEN: Record<keyof OnboardingProductItem, number> = {
  nome: 140,
  custo_unitario: 40,
  estoque: 40,
  prazo_reposicao: 60,
  limitacao_fornecimento: 200,
  observacao: 300,
};

/** Teto absoluto quando não há limite contratual informado. */
export const PRODUCT_HARD_CAP = 50;

export function emptyProductItem(): OnboardingProductItem {
  return {
    nome: "",
    custo_unitario: "",
    estoque: "",
    prazo_reposicao: "",
    limitacao_fornecimento: "",
    observacao: "",
  };
}

export function isEmptyProductItem(item: OnboardingProductItem): boolean {
  return PRODUCT_FIELDS.every((f) => item[f].trim() === "");
}

function coerceField(value: unknown, field: keyof OnboardingProductItem): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_LEN[field]);
}

/**
 * Normaliza um valor arbitrário (payload do cliente) em itens de produto.
 * Descarta chaves desconhecidas, linhas vazias e itens além do limite.
 */
export function normalizeProductItems(
  value: unknown,
  limit?: number | null,
): OnboardingProductItem[] {
  if (!Array.isArray(value)) return [];
  const cap = resolveProductCap(limit);
  const out: OnboardingProductItem[] = [];
  for (const raw of value) {
    if (out.length >= cap) break;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const src = raw as Record<string, unknown>;
    const item = emptyProductItem();
    for (const f of PRODUCT_FIELDS) item[f] = coerceField(src[f], f);
    if (isEmptyProductItem(item)) continue;
    out.push(item);
  }
  return out;
}

/** Limite efetivo de itens: contrato quando existir, senão o teto absoluto. */
export function resolveProductCap(limit?: number | null): number {
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    return Math.min(Math.floor(limit), PRODUCT_HARD_CAP);
  }
  return PRODUCT_HARD_CAP;
}

/**
 * Validação de negócio da etapa de produtos.
 * Retorna a primeira mensagem de erro ou `null` quando válido.
 */
export function validateProductItems(
  value: unknown,
  options: { required: boolean; limit?: number | null },
): string | null {
  const items = normalizeProductItems(value, options.limit ?? null);

  if (items.length === 0) {
    return options.required ? "Informe ao menos um produto para iniciarmos o acompanhamento." : null;
  }

  const cap = resolveProductCap(options.limit ?? null);
  const rawCount = Array.isArray(value)
    ? (value as unknown[]).filter(
        (r) =>
          !!r &&
          typeof r === "object" &&
          !Array.isArray(r) &&
          !isEmptyProductItem({ ...emptyProductItem(), ...(r as object) } as OnboardingProductItem),
      ).length
    : 0;
  if (rawCount > cap) {
    return `O plano contratado contempla até ${cap} produto(s). Remova os excedentes para continuar.`;
  }

  for (const [i, item] of items.entries()) {
    if (!item.nome) return `Informe o nome do produto ${i + 1}.`;
    if (!item.custo_unitario) return `Informe o custo unitário de "${item.nome}".`;
  }
  return null;
}

/** Resumo legível para revisão do cliente e leitura do operador no CRM. */
export function formatProductItems(value: unknown): string {
  const items = normalizeProductItems(value);
  if (items.length === 0) return "—";
  return items
    .map((it, i) => {
      const parts = [`${i + 1}. ${it.nome}`];
      if (it.custo_unitario) parts.push(`custo ${it.custo_unitario}`);
      if (it.estoque) parts.push(`estoque ${it.estoque}`);
      if (it.prazo_reposicao) parts.push(`reposição ${it.prazo_reposicao}`);
      if (it.limitacao_fornecimento) parts.push(`limitação: ${it.limitacao_fornecimento}`);
      if (it.observacao) parts.push(`obs.: ${it.observacao}`);
      return parts.join(" · ");
    })
    .join("\n");
}
