import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getApiSpec } from "@/lib/os/api/docs.functions";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Code2, ExternalLink, Info, Terminal } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/api-docs/openapi")({
  component: OpenApiPage,
  loader: ({ context }) => {
    return context.queryClient.ensureQueryData({
      queryKey: ["api-spec"],
      queryFn: () => getApiSpec(),
    });
  },
});

function OpenApiPage() {
  const { data } = useSuspenseQuery({
    queryKey: ["api-spec"],
    queryFn: () => getApiSpec(),
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
            <BreadcrumbPage>OpenAPI Spec</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold tracking-tight">OpenAPI Specification</h1>
          <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary uppercase">v1.0.0</Badge>
        </div>
        <p className="text-lg text-muted-foreground leading-relaxed">
          O contrato formal da API v1 do Valtro OS seguindo o padrão OpenAPI 3.1.0.
        </p>
      </div>

      <Alert className="bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertTitle className="text-blue-800 dark:text-blue-300">Integração com Scalar</AlertTitle>
        <AlertDescription className="text-blue-700/80 dark:text-blue-400/80">
          A arquitetura para renderização interativa com Scalar está preparada. Nesta sprint, o foco permanece na integridade do contrato bruto. A documentação interativa será ativada em uma sprint futura.
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            Contrato YAML
          </h3>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => {
            const blob = new Blob([data?.content as string], { type: 'text/yaml' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'openapi-v1.yaml';
            a.click();
          }}>
            Download YAML
          </Button>
        </div>
        
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/20 pointer-events-none rounded-xl" />
          <pre className="p-6 rounded-xl border bg-muted/50 overflow-x-auto text-[13px] leading-relaxed font-mono">
            {data?.content as string}
          </pre>
        </div>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";
