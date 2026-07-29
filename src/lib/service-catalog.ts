/**
 * Sprint 15.2.3A — Fonte única do catálogo comercial.
 *
 * A tabela `public.services` é a ÚNICA fonte oficial do portfólio comercial
 * da Valtro Labs. Este módulo contém apenas helpers puros de apresentação
 * (agrupamento e derivação de opções) sobre os dados vindos do catálogo —
 * nunca uma lista fixa de serviços.
 *
 * Rótulos de categoria vêm de `SERVICE_TYPE_LABEL` (tradução do enum), o que
 * é permitido: é label auxiliar, não fonte de serviços.
 */
import type { CatalogService } from "@/lib/services.functions";
import { SERVICE_TYPE_LABEL, type ServiceType } from "@/types/briefing";

export interface ServiceCategoryGroup {
  category: ServiceType;
  label: string;
  services: CatalogService[];
}

/** Somente serviços ativos — disponibilidade é responsabilidade do catálogo. */
export function activeServices(services: CatalogService[]): CatalogService[] {
  return services.filter((s) => s.active);
}

/** Agrupa serviços ativos por categoria, preservando a ordem do catálogo. */
export function groupServicesByCategory(
  services: CatalogService[],
): ServiceCategoryGroup[] {
  const groups = new Map<ServiceType, CatalogService[]>();
  for (const service of activeServices(services)) {
    const bucket = groups.get(service.category);
    if (bucket) bucket.push(service);
    else groups.set(service.category, [service]);
  }
  return [...groups.entries()].map(([category, list]) => ({
    category,
    label: SERVICE_TYPE_LABEL[category] ?? "Não definido",
    services: list,
  }));
}

export interface ServiceCategoryOption {
  value: Exclude<ServiceType, "nao_definido">;
  label: string;
  /** Serviços do catálogo que sustentam esta categoria (apoio à UI). */
  services: CatalogService[];
}

/**
 * Deriva as opções de "tipo de serviço" (enum `service_type`) a partir das
 * categorias efetivamente presentes no catálogo. Nenhuma lista fixa envolvida.
 */
export function serviceCategoryOptions(
  services: CatalogService[],
): ServiceCategoryOption[] {
  return groupServicesByCategory(services)
    .filter((g): g is ServiceCategoryGroup & { category: Exclude<ServiceType, "nao_definido"> } =>
      g.category !== "nao_definido",
    )
    .map((g) => ({ value: g.category, label: g.label, services: g.services }));
}

/** Rótulo auxiliar de uma categoria/tipo de serviço. */
export function serviceTypeLabel(value: ServiceType | null | undefined): string {
  if (!value) return "Não definido";
  return SERVICE_TYPE_LABEL[value] ?? "Não definido";
}

// ============================================================
// Sprint 15.2.3B — Estrutura comercial do serviço
// ============================================================

import type {
  ServiceDefaultLimits,
  ServiceOfferType,
  ServicePricingMode,
} from "@/lib/services.functions";

/** Posição da oferta no portfólio. */
export const SERVICE_OFFER_TYPE_LABEL: Record<ServiceOfferType, string> = {
  principal: "Principal",
  complementar: "Complementar",
  recorrente: "Recorrente",
};

/** Modelo de precificação — "sob consulta" é estado explícito, não ausência de valor. */
export const SERVICE_PRICING_MODE_LABEL: Record<ServicePricingMode, string> = {
  fixo: "Preço fixo",
  sob_consulta: "Sob consulta",
};

/** Contrato conhecido de limites (espelha a validação no banco). */
export const SERVICE_LIMIT_LABEL: Record<keyof ServiceDefaultLimits, string> = {
  max_products: "Produtos",
  max_campaigns: "Campanhas",
  max_users: "Usuários",
};

export const SERVICE_LIMIT_KEYS = Object.keys(
  SERVICE_LIMIT_LABEL,
) as (keyof ServiceDefaultLimits)[];

/** Renderiza os limites do serviço em texto legível; "—" quando não há limites. */
export function formatServiceLimits(limits: ServiceDefaultLimits | null | undefined): string {
  if (!limits) return "—";
  const parts = SERVICE_LIMIT_KEYS.flatMap((key) => {
    const value = limits[key];
    return typeof value === "number" ? [`${SERVICE_LIMIT_LABEL[key]}: ${value}`] : [];
  });
  return parts.length > 0 ? parts.join(" · ") : "—";
}
