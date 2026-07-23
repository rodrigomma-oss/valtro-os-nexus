/**
 * Biblioteca de serviços reutilizável para propostas comerciais.
 * Sprint 11.
 */

export type ServiceCategory = "desenvolvimento" | "consultoria" | "produto";

export interface ServiceLibraryItem {
  key: string;
  label: string;
  category: ServiceCategory;
  defaultDescription?: string;
  defaultUnitPrice?: number;
}

export const SERVICE_LIBRARY: ServiceLibraryItem[] = [
  // Desenvolvimento
  { key: "dev_landing", label: "Landing Page", category: "desenvolvimento", defaultDescription: "Landing page institucional ou de campanha, responsiva e otimizada." },
  { key: "dev_site", label: "Site Institucional", category: "desenvolvimento", defaultDescription: "Site institucional multi-página com CMS." },
  { key: "dev_sistema", label: "Sistema Web", category: "desenvolvimento", defaultDescription: "Sistema web sob medida." },
  { key: "dev_portal_cliente", label: "Portal do Cliente", category: "desenvolvimento", defaultDescription: "Portal do cliente para acompanhamento e relacionamento." },
  { key: "dev_crm", label: "CRM", category: "desenvolvimento", defaultDescription: "CRM customizado para operação comercial." },
  { key: "dev_integracoes", label: "Integrações", category: "desenvolvimento", defaultDescription: "Integrações com marketplaces, ERPs e APIs terceiras." },
  { key: "dev_manutencao", label: "Manutenção", category: "desenvolvimento", defaultDescription: "Manutenção evolutiva mensal." },

  // Consultoria
  { key: "cons_analise_loja", label: "Análise de Loja", category: "consultoria", defaultDescription: "Diagnóstico consultivo da operação atual." },
  { key: "cons_otimizacao_loja", label: "Otimização de Loja", category: "consultoria", defaultDescription: "Plano de otimização baseado no diagnóstico." },
  { key: "cons_implementacao_melhorias", label: "Implementação das melhorias", category: "consultoria", defaultDescription: "Execução do plano de melhorias." },
  { key: "cons_shopee_ads", label: "Configuração Shopee Ads", category: "consultoria", defaultDescription: "Estruturação de campanhas Shopee Ads." },

  // Produtos
  { key: "prod_pricing_basic", label: "Valtro Pricing Basic", category: "produto", defaultDescription: "Plano Basic — Valtro Pricing." },
  { key: "prod_pricing_professional", label: "Valtro Pricing Professional", category: "produto", defaultDescription: "Plano Professional — Valtro Pricing." },
];

export const CATEGORY_LABEL: Record<ServiceCategory, string> = {
  desenvolvimento: "Desenvolvimento",
  consultoria: "Consultoria",
  produto: "Produtos",
};

export function groupServiceLibrary(): Record<ServiceCategory, ServiceLibraryItem[]> {
  const groups: Record<ServiceCategory, ServiceLibraryItem[]> = {
    desenvolvimento: [],
    consultoria: [],
    produto: [],
  };
  for (const s of SERVICE_LIBRARY) groups[s.category].push(s);
  return groups;
}

export function findServiceByKey(key: string | null | undefined) {
  if (!key) return null;
  return SERVICE_LIBRARY.find((s) => s.key === key) ?? null;
}
