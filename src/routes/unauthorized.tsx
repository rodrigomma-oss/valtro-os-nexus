import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { AlertCircle, LogOut } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/unauthorized")({
  component: UnauthorizedPage,
  head: () => ({
    meta: [
      { title: "Acesso Não Autorizado — Valtro Labs" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function UnauthorizedPage() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair", { description: error.message });
      return;
    }
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <Logo variant="compact" />
        </div>
        
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Acesso não autorizado
          </h1>
          <div className="space-y-2 text-muted-foreground text-sm leading-relaxed">
            <p>
              Sua conta foi autenticada com sucesso, mas você ainda não possui permissão para acessar o Valtro OS.
            </p>
            <p>
              O acesso à plataforma é restrito a colaboradores autorizados da Valtro Labs. 
              Se você acredita que isso é um erro, entre em contato com o administrador do sistema.
            </p>
          </div>
        </div>

        <div className="pt-4 flex flex-col gap-3">
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair e entrar com outra conta
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => navigate({ to: "/" })}>
            Voltar para a Home
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground uppercase tracking-widest pt-8">
          Valtro Labs &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
