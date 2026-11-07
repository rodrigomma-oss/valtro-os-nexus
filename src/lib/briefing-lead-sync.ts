/**
 * Sincronização cadastral Briefing → Lead (lógica pura, testável).
 *
 * Regras aprovadas:
 *  - Campo vazio no Lead + valor válido no briefing → atualizar automaticamente.
 *  - Mesmo valor após normalização → no-op.
 *  - Valor diferente → conflito pendente, sem sobrescrever.
 *  - Nunca toca em status, responsável, origem, serviço, proposta ou valores.
 *
 * O módulo é puro: não importa Supabase nem executa I/O.
 */
import { onlyDigits } from "@/lib/formatters";

/** Colunas de `public.leads` liberadas para sincronização (whitelist). */
export const SYNCABLE_LEAD_FIELDS = [
  "contact_name",
  "company_name",
  "email",
  "phone",
  "city",
  "state",
  "segment",
  "instagram",
] as const;

export type SyncableLeadField = (typeof SYNCABLE_LEAD_FIELDS)[number];

/**
 * Mapeamento chave do briefing → coluna real do Lead.
 * A ordem importa: a primeira chave presente e não-vazia vence.
 */
export const BRIEFING_FIELD_MAP: ReadonlyArray<
  readonly [briefingKey: string, leadField: SyncableLeadField]
> = [
  ["nome", "contact_name"],
  ["nome_completo", "contact_name"],
  ["contato", "contact_name"],
  ["empresa", "company_name"],
  ["nome_loja", "company_name"],
  ["loja_nome", "company_name"],
  ["email", "email"],
  ["e_mail", "email"],
  ["whatsapp", "phone"],
  ["telefone", "phone"],
  ["cidade", "city"],
  ["estado", "state"],
  ["uf", "state"],
  ["segmento", "segment"],
  ["instagram", "instagram"],
];

export interface LeadCadastro {
  contact_name?: string | null;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  segment?: string | null;
  instagram?: string | null;
}

export interface FieldConflict {
  field: SyncableLeadField;
  current_value: string;
  briefing_value: string;
}

export interface BriefingLeadSyncPlan {
  /** Campos a atualizar no Lead (um único UPDATE). */
  updates: Partial<Record<SyncableLeadField, string>>;
  /** Divergências que exigem revisão manual. */
  conflicts: FieldConflict[];
}

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function deaccent(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normaliza um valor bruto para a forma que será persistida no Lead.
 * Retorna `null` quando o valor não é utilizável (vazio, só espaços, inválido).
 */
export function normalizeFieldValue(
  field: SyncableLeadField,
  raw: unknown,
): string | null {
  if (typeof raw !== "string") return null;
  const base = collapse(raw);
  if (!base) return null;

  switch (field) {
    case "phone": {
      const digits = onlyDigits(base);
      // Aceita DDD + número (10 ou 11 dígitos) e tolera prefixo 55.
      const local =
        digits.length > 11 && digits.startsWith("55")
          ? digits.slice(2)
          : digits;
      if (local.length < 10 || local.length > 11) return null;
      return local;
    }
    case "email": {
      const email = base.toLowerCase().replace(/\s+/g, "");
      if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) return null;
      return email;
    }
    case "state": {
      const uf = deaccent(base).toUpperCase().replace(/[^A-Z]/g, "");
      if (uf.length !== 2) return null;
      return uf;
    }
    case "instagram": {
      let handle = base.toLowerCase();
      handle = handle.replace(/^https?:\/\/(www\.)?instagram\.com\//, "");
      handle = handle.replace(/^@/, "").replace(/\/+$/, "");
      handle = handle.replace(/\s+/g, "");
      if (!handle) return null;
      return handle;
    }
    default:
      return base;
  }
}

/** Chave canônica de comparação (case/acento-insensível quando aplicável). */
export function comparisonKey(
  field: SyncableLeadField,
  normalized: string,
): string {
  switch (field) {
    case "phone":
    case "email":
    case "state":
    case "instagram":
      return normalized;
    default:
      return deaccent(normalized).toLowerCase();
  }
}

/** Extrai os valores cadastrais normalizados presentes no payload do briefing. */
export function extractBriefingCadastro(
  data: Record<string, unknown> | null | undefined,
): Partial<Record<SyncableLeadField, string>> {
  const out: Partial<Record<SyncableLeadField, string>> = {};
  if (!data) return out;

  for (const [key, field] of BRIEFING_FIELD_MAP) {
    if (field in out) continue;
    if (!(key in data)) continue;
    const normalized = normalizeFieldValue(field, data[key]);
    if (normalized === null) continue;
    out[field] = normalized;
  }
  return out;
}

/**
 * Calcula o plano de sincronização a partir do Lead atual e do briefing.
 * Não executa nada — apenas descreve updates e conflitos.
 */
export function buildBriefingLeadSyncPlan(
  lead: LeadCadastro,
  briefingData: Record<string, unknown> | null | undefined,
): BriefingLeadSyncPlan {
  const incoming = extractBriefingCadastro(briefingData);
  const updates: Partial<Record<SyncableLeadField, string>> = {};
  const conflicts: FieldConflict[] = [];

  for (const field of SYNCABLE_LEAD_FIELDS) {
    const value = incoming[field];
    if (!value) continue;

    const currentRaw = lead[field];
    const current =
      typeof currentRaw === "string" ? collapse(currentRaw) : "";

    if (!current) {
      updates[field] = value;
      continue;
    }

    const currentNormalized = normalizeFieldValue(field, current);
    if (
      currentNormalized !== null &&
      comparisonKey(field, currentNormalized) === comparisonKey(field, value)
    ) {
      continue; // no-op
    }

    conflicts.push({
      field,
      current_value: current,
      briefing_value: value,
    });
  }

  return { updates, conflicts };
}

/** Rótulos em pt-BR para exibição na interface. */
export const LEAD_FIELD_LABEL: Record<SyncableLeadField, string> = {
  contact_name: "Nome do contato",
  company_name: "Empresa",
  email: "E-mail",
  phone: "Telefone",
  city: "Cidade",
  state: "Estado",
  segment: "Segmento",
  instagram: "Instagram",
};
