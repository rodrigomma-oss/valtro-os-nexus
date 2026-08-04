import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getApiDoc } from "@/lib/os/api/docs.functions";
import { MarkdownContent } from "@/components/developers/markdown-content";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

export const Route = createFileRoute("/api-docs/status")({
  component: ImplementationStatusPage,
  loader: ({ context }) => {
    return context.queryClient.ensureQueryData({
      queryKey: ["api-docs", "implementation-status"],
      queryFn: () => getApiDoc({ data: { slug: "implementation-status" } }),
    });
  },
});

function ImplementationStatusPage() {
  const { data } = useSuspenseQuery({
    queryKey: ["api-docs", "implementation-status"],
    queryFn: () => getApiDoc({ data: { slug: "implementation-status" } }),
  });

  return (
    <div className="space-y-10">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/api-docs">Documentação</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Status da Implementação</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Matriz de Implementação</h1>
        <p className="text-lg text-muted-foreground">
          Consulte o estado de prontidão de cada componente da API v1.
        </p>
      </div>

      <MarkdownContent content={data.content} />
    </div>
  );
}
