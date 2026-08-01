import { Link, useRouterState } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useBreadcrumbLabels } from "@/lib/breadcrumb-store";

const SEGMENT_LABELS: Record<string, string> = {
  os: "Valtro OS",
  crm: "Valtro OS",
  dashboard: "Dashboard",
  comercial: "Comercial",
  leads: "Leads",
  clientes: "Clientes",
  projetos: "Projetos",
  servicos: "Serviços",
  atendimento: "Atendimento",
  chamados: "Chamados",
  bugs: "Bugs",
  feedback: "Feedback",
  produtos: "Produtos",
  "valtro-pricing": "Valtro Pricing",
  beta: "Beta Fechado",
  admin: "Administração",
  usuarios: "Usuários",
  integracoes: "Integrações",
  analises: "Análises",
  propostas: "Propostas",
  configuracoes: "Configurações",
  briefing: "Briefing",
};

/** Segmentos que não representam uma página navegável própria. */
const NON_NAVIGABLE = new Set(["comercial", "atendimento", "produtos", "valtro-pricing", "admin"]);

function labelFor(segment: string, dynamicLabels: Record<string, string>): string {
  const dynamic = dynamicLabels[segment];
  if (dynamic) return dynamic;
  const mapped = SEGMENT_LABELS[segment];
  if (mapped) return mapped;
  if (segment.startsWith("lead-")) return segment.toUpperCase();
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

/**
 * Breadcrumb do painel — deriva os itens do pathname atual e usa rótulos
 * amigáveis registrados pelas páginas de detalhe (lead/cliente/projeto).
 */
export function AppBreadcrumb() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const dynamicLabels = useBreadcrumbLabels();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const nodes = segments.flatMap((segment, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/");
    const isLast = idx === segments.length - 1;
    const label = labelFor(segment, dynamicLabels);
    const navigable = !NON_NAVIGABLE.has(segment);

    const item = (
      <BreadcrumbItem key={`item-${href}`}>
        {isLast || !navigable ? (
          <BreadcrumbPage
            className={isLast ? "text-foreground font-medium" : "text-muted-foreground"}
          >
            {label}
          </BreadcrumbPage>
        ) : (
          <BreadcrumbLink asChild>
            <Link
              to={href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {label}
            </Link>
          </BreadcrumbLink>
        )}
      </BreadcrumbItem>
    );

    return isLast ? [item] : [item, <BreadcrumbSeparator key={`sep-${href}`} />];
  });

  return (
    <Breadcrumb>
      <BreadcrumbList>{nodes}</BreadcrumbList>
    </Breadcrumb>
  );
}
