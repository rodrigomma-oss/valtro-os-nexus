import { Link, useRouterState } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const SEGMENT_LABELS: Record<string, string> = {
  crm: "CRM",
  leads: "Leads",
  dashboard: "Dashboard",
  analises: "Análises",
  propostas: "Propostas",
  clientes: "Clientes",
  configuracoes: "Configurações",
  briefing: "Briefing",
  admin: "Admin",
};

function labelFor(segment: string): string {
  const mapped = SEGMENT_LABELS[segment];
  if (mapped) return mapped;
  if (segment.startsWith("lead-")) return segment.toUpperCase();
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

/**
 * Breadcrumb do painel — deriva os itens diretamente do pathname atual.
 * Separadores são renderizados como irmãos dos itens (nunca aninhados) para
 * evitar `<li>` dentro de `<li>` e o consequente hydration mismatch.
 */
export function AppBreadcrumb() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const nodes = segments.flatMap((segment, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/");
    const isLast = idx === segments.length - 1;
    const item = (
      <BreadcrumbItem key={`item-${href}`}>
        {isLast ? (
          <BreadcrumbPage className="text-foreground font-medium">
            {labelFor(segment)}
          </BreadcrumbPage>
        ) : (
          <BreadcrumbLink asChild>
            <Link
              to={href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {labelFor(segment)}
            </Link>
          </BreadcrumbLink>
        )}
      </BreadcrumbItem>
    );
    return isLast
      ? [item]
      : [item, <BreadcrumbSeparator key={`sep-${href}`} />];
  });

  return (
    <Breadcrumb>
      <BreadcrumbList>{nodes}</BreadcrumbList>
    </Breadcrumb>
  );
}
