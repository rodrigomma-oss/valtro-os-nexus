import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getApiDoc } from "@/lib/os/api/docs.functions";
import { MarkdownContent } from "@/components/developers/markdown-content";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/api-docs/$slug")({
  component: ApiDocPage,
  loader: ({ params, context }) => {
    return context.queryClient.ensureQueryData({
      queryKey: ["api-docs", params.slug],
      queryFn: () => getApiDoc({ data: { slug: params.slug } }),
    });
  },
});

/**
 * Rótulos da navegação pública (OPS-API-004A.2).
 * Páginas internas permanecem acessíveis por URL direta, com rótulo derivado do slug.
 */
const SLUG_LABELS: Record<string, string> = {
  "getting-started": "Primeiros Passos",
  "authentication": "Autenticação",
  "errors": "Erros",
  "versioning": "Versionamento",
  "audit-os": "Auditoria do Provedor",
};


function ApiDocPage() {
  const { slug } = Route.useParams();
  const { data, error } = useSuspenseQuery({
    queryKey: ["api-docs", slug],
    queryFn: () => getApiDoc({ data: { slug } }),
    retry: 1, // Permite uma tentativa em caso de falha transitória
  });

  if (error) {
    return (
      <div className="p-8 border border-destructive/20 bg-destructive/5 rounded-lg text-destructive">
        <h2 className="text-xl font-bold mb-2">Erro ao carregar documento</h2>
        <p>Ocorreu um problema ao tentar carregar "{slug}". Verifique se o caminho está correto.</p>
      </div>
    );
  }

  const label = SLUG_LABELS[slug] || slug;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/api-docs">Introdução</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{label}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <MarkdownContent content={data?.content as string} />
    </div>
  );
}
