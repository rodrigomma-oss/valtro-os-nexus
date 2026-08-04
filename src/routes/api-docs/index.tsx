import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  Key, 
  Code2, 
  Activity, 
  AlertCircle, 
  Map, 
  GitBranch, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Cpu
} from "lucide-react";

export const Route = createFileRoute("/api-docs/")({
  component: DevelopersHome,
});

function DevelopersHome() {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold ring-1 ring-primary/20">
          <Zap className="h-3 w-3" />
          <span>VOS-API v1.0 Disponível</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
          Portal do Desenvolvedor <span className="text-primary">Valtro OS</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
          Bem-vindo à documentação oficial da API do Valtro OS. Construa integrações poderosas com o sistema operacional da Valtro Labs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="group hover:border-primary/50 transition-all shadow-sm">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Play className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Primeiros Passos</CardTitle>
            <CardDescription>
              Aprenda a realizar sua primeira chamada à API e entenda a estrutura básica das respostas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link 
              to="/api-docs/getting-started" 
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Começar agora
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="group hover:border-primary/50 transition-all shadow-sm">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Autenticação HMAC</CardTitle>
            <CardDescription>
              Entenda o protocolo VALTRO-HMAC-SHA256-V1 para integrações seguras e autenticadas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link 
              to="/api-docs/authentication" 
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Ver protocolo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Cpu className="h-4 w-4 text-primary" />
          Referências Técnicas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: "OpenAPI Spec", href: "/api-docs/openapi", icon: Code2, desc: "Contrato formal v1.0" },
            { title: "Erros & Status", href: "/api-docs/errors", icon: AlertCircle, desc: "Catálogo de códigos" },
            { title: "Versionamento", href: "/api-docs/versioning", icon: GitBranch, desc: "Ciclo de vida v1" },
            { title: "Pipeline", href: "/api-docs/pipeline", icon: Activity, desc: "Fluxo de processamento" },
            { title: "Roadmap", href: "/api-docs/roadmap", icon: Map, desc: "Próximas capacidades" },
            { title: "Integration Guide", href: "/api-docs/integration-guide", icon: ShieldCheck, desc: "Limites e ambientes" },
          ].map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="flex items-start gap-4 p-4 rounded-xl border bg-card/50 hover:bg-muted/50 transition-colors group"
            >
              <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-medium group-hover:text-foreground transition-colors">{item.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">{item.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-muted/30 border rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-tight">Status da Implementação</h3>
          <p className="text-sm text-muted-foreground">
            Acompanhe o que já está operacional e o que está planejado para a API pública.
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link to="/api-docs/status">Ver Matriz de Status</Link>
        </Button>
      </div>
    </div>
  );
}
