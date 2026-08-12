import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/os/configuracoes/seguranca")({
  component: SecurityPage,
  head: () => ({
    meta: [
      { title: "Segurança e Acesso — Valtro OS" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function SecurityPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    
    if (password.length < 8) {
      toast.error("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    setLoading(true);
    try {
      // P1: Tratar explicitamente o erro e atualizar o estado local com o usuário retornado
      const { data, error } = await supabase.auth.updateUser({ 
        password,
        data: { has_local_password: true }
      });

      if (error) {
        toast.error("Erro ao configurar senha", {
          description: error.message || "O Supabase retornou um erro inesperado.",
        });
        setLoading(false);
        return;
      }

      // Sucesso confirmado
      toast.success("Senha configurada com sucesso!", {
        description: "Sua credencial local está ativa. O banner de aviso será removido.",
      });
      
      setPassword("");
      setConfirm("");
      
      // A atualização do metadata deve refletir no próximo reload do Dashboard.
      // Opcional: forçar um refresh do session ou apenas deixar que o usuário navegue.
    } catch (err: any) {
      toast.error("Falha na comunicação", {
        description: err.message || "Tente novamente mais tarde.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Gerencie sua segurança e métodos de acesso.</p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <CardTitle>Credencial Local (Senha)</CardTitle>
          </div>
          <CardDescription>
            Defina uma senha para acessar o Valtro OS sem depender exclusivamente de provedores externos (Google).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 border border-border rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Por que definir uma senha?</p>
              <p>Ter uma senha local garante que você sempre consiga acessar a plataforma, mesmo que o serviço do Google esteja indisponível ou você perca o acesso à conta externa.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="bg-background border-border"
              />
            </div>
            
            <div className="pt-2">
              <Button type="submit" disabled={loading} className="w-full md:w-auto min-w-[160px]">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Configurar Senha"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border bg-card opacity-60">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Outros Métodos</CardTitle>
          <CardDescription>
            Atualmente sua conta está vinculada aos provedores abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-sm font-medium p-3 border border-border rounded-md bg-muted/20">
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09A6.987 6.987 0 0 1 5.47 12c0-.73.13-1.43.36-2.09V7.07H2.18A11.002 11.002 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
            </svg>
            Google Identity
            <span className="ml-auto text-xs text-green-500 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Ativo
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
