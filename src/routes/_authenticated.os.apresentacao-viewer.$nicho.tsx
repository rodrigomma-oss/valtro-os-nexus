import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { NICHOS } from "@/modules/commercial/config";
import { PresentationLayout } from "@/layouts/presentation-layout";
import { PresentationProvider, DynamicText } from "@/modules/commercial/presentation-context";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

const presentationSearchSchema = z.object({
  company: z.string(),
  city: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/os/apresentacao-viewer/$nicho")({
  validateSearch: (search) => presentationSearchSchema.parse(search),
  component: PresentationViewerPage,
});

function PresentationViewerPage() {
  const { nicho: nichoId } = Route.useParams();
  const { company, city } = Route.useSearch();
  
  const nicho = NICHOS.find(n => n.id === nichoId) || NICHOS[0];

  return (
    <PresentationProvider empresa={company} cidade={city}>
      <PresentationLayout themeClass={nicho.themeClass}>
        <div className="relative min-h-screen flex flex-col">
          {/* Barra de Ferramentas da Apresentação (Visível para o vendedor) */}
          <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border/40 print:hidden">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild className="gap-2">
                <Link to="/os/comercial/apresentacoes">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar ao CRM
                </Link>
              </Button>
              <div className="h-4 w-px bg-border" />
              <div className="text-sm font-medium text-muted-foreground">
                Visualizador: <span className="text-foreground">{nicho.label}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Share2 className="h-4 w-4" />
                Compartilhar Tela
              </Button>
            </div>
          </header>

          <main className="flex-1 flex items-center justify-center p-8 pt-24">
            {/* Placeholder Técnico */}
            <div className="max-w-4xl w-full text-center space-y-12">
              <div className="space-y-6">
                <div className="inline-flex rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
                  Motor de Apresentação Ativo
                </div>
                <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
                  <DynamicText template="Uma nova experiência digital para {{empresa}}" />
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  <DynamicText 
                    template="Personalizando soluções inteligentes para o mercado de {{cidade}}." 
                    fallbackCidade="todo o Brasil"
                  />
                </p>
              </div>

              <div className="grid gap-8 sm:grid-cols-3">
                {[
                  { label: "Nicho Selecionado", value: nicho.label },
                  { label: "Empresa do Lead", value: company },
                  { label: "Cidade de Atuação", value: city || "Não informada" }
                ].map((item) => (
                  <div key={item.label} className="p-6 rounded-2xl border bg-surface shadow-soft">
                    <dt className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{item.label}</dt>
                    <dd className="mt-2 text-2xl font-semibold">{item.value}</dd>
                  </div>
                ))}
              </div>

              <div className="bg-muted/50 p-8 rounded-3xl border border-dashed border-border flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  🏗️
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">Placeholder de Conteúdo (AC-001.1)</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    Esta tela é uma prova de conceito do isolamento visual e injeção de contexto. 
                    O conteúdo comercial definitivo será implementado no Gate AC-001.2.
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </PresentationLayout>
    </PresentationProvider>
  );
}
