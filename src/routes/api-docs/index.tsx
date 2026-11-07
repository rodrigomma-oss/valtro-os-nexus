import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  Key, 
  Code2, 
  AlertCircle, 
  GitBranch, 
  ArrowRight,
  Zap,
  Cpu
} from "lucide-react";

export const Route = createFileRoute("/api-docs/")({
  component: DevelopersHome,
});

function DevelopersHome() {
  return (
    <div className="space-y-16 max-w-5xl mx-auto">
      {/* Hero Section */}
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold ring-1 ring-primary/20 tracking-wider uppercase">
          <Zap className="h-3 w-3" />
          <span>VOS-API v1.0 Stable</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
          Construa integrações para a <span className="text-primary">Plataforma Valtro Labs</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl leading-relaxed">
          Conecte aplicações ao Valtro OS utilizando nossa API pública, autenticação HMAC e documentação oficial.
        </p>
      </div>

      {/* Primary Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="group relative overflow-hidden hover:border-primary/50 transition-all shadow-md bg-card/50 backdrop-blur-sm border-muted/50">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Play className="h-24 w-24" />
          </div>
          <CardHeader className="relative">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
              <Play className="h-6 w-6 text-primary fill-primary/20" />
            </div>
            <CardTitle className="text-2xl">Aplicações Valtro Labs</CardTitle>
            <CardDescription className="text-base leading-relaxed mt-2">
              Do zero à primeira chamada. Entenda o fluxo de criação de aplicações e a estrutura das respostas JSON.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <Link 
              to="/api-docs/$slug"
              params={{ slug: "getting-started" }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              Iniciar Integração
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden hover:border-primary/50 transition-all shadow-md bg-card/50 backdrop-blur-sm border-muted/50">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Key className="h-24 w-24" />
          </div>
          <CardHeader className="relative">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
              <Key className="h-6 w-6 text-primary fill-primary/20" />
            </div>
            <CardTitle className="text-2xl">Autenticação HMAC</CardTitle>
            <CardDescription className="text-base leading-relaxed mt-2">
              Segurança nível enterprise. Implemente o protocolo VALTRO-HMAC-SHA256-V1 para assinar suas chamadas.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <Link 
              to="/api-docs/$slug"
              params={{ slug: "authentication" }}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline group/link underline-offset-4"
            >
              Ver Guia de Segurança
              <ArrowRight className="h-4 w-4 group-hover/link:translate-x-1 transition-transform" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Technical References */}
      <div className="space-y-8 pt-8 border-t border-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            Documentação Técnica
          </h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "OpenAPI Spec", href: "/api-docs/openapi", icon: Code2, desc: "Endpoints e Esquemas v1.0" },
            { title: "Autenticação", href: "/api-docs/authentication", icon: Key, desc: "Protocolo HMAC-SHA256" },
            { title: "Erros & Status", href: "/api-docs/errors", icon: AlertCircle, desc: "Catálogo de códigos HTTP" },
            { title: "Versionamento", href: "/api-docs/versioning", icon: GitBranch, desc: "Políticas de breaking changes" },
          ].map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="flex flex-col gap-3 p-6 rounded-2xl border bg-card/40 hover:bg-muted/30 hover:border-primary/30 transition-all group relative overflow-hidden"
            >
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold group-hover:text-foreground transition-colors tracking-tight">{item.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{item.desc}</div>
              </div>
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-3 w-3 text-primary" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Call to Action Footer */}
      <div className="bg-primary/5 rounded-3xl p-8 md:p-12 border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-2">
          <h4 className="text-2xl font-bold tracking-tight">Precisa de ajuda com a integração?</h4>
          <p className="text-muted-foreground">Nossa equipe técnica está disponível para auxiliar no seu onboarding.</p>
        </div>
        <Button className="shrink-0" size="lg">
          Falar com Suporte
        </Button>
      </div>
    </div>
  );
}
