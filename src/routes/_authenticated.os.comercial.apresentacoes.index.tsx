import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { NICHOS } from "@/modules/commercial/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, MapPin, Presentation, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";

export const Route = createFileRoute("/_authenticated/os/comercial/apresentacoes/")({
  component: AdminPresentationPage,
});

function AdminPresentationPage() {
  const navigate = useNavigate();
  const [nicho, setNicho] = useState<string>("");
  const [empresa, setEmpresa] = useState("");
  const [cidade, setCidade] = useState("");

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nicho || !empresa) return;

    navigate({
      to: "/_authenticated/os/apresentacao-viewer/$nicho",
      params: { nicho },
      search: {
        company: empresa,
        city: cidade || undefined,
      },
    } as any);
  };

  return (
    <div className="container-page py-8">
      <PageHeader
        title="Apresentação Comercial"
        description="Configure o contexto e inicie uma apresentação personalizada para o lead."
      />

      <div className="mt-8 max-w-2xl">
        <form onSubmit={handleStart}>
          <Card className="border-border/50 shadow-soft">
            <CardHeader>
              <CardTitle className="text-xl">Nova Sessão de Apresentação</CardTitle>
              <CardDescription>
                Selecione o nicho e informe os dados da empresa para personalizar a experiência.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nicho">Nicho da Empresa</Label>
                <Select onValueChange={setNicho} value={nicho}>
                  <SelectTrigger id="nicho" className="h-11">
                    <SelectValue placeholder="Selecione um nicho..." />
                  </SelectTrigger>
                  <SelectContent>
                    {NICHOS.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        <div className="flex items-center gap-2">
                          <Presentation className="h-4 w-4 text-muted-foreground" />
                          <span>{n.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="empresa">Nome da Empresa *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="empresa"
                      placeholder="Ex: Villa Pet"
                      className="pl-9 h-11"
                      value={empresa}
                      onChange={(e) => setEmpresa(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade (Opcional)</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="cidade"
                      placeholder="Ex: Campina Grande"
                      className="pl-9 h-11"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t py-4">
              <Button 
                type="submit" 
                className="w-full sm:w-auto ml-auto" 
                disabled={!nicho || !empresa}
                size="lg"
              >
                Iniciar Apresentação
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  );
}
