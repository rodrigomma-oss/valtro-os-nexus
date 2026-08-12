import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";

export const Route = createFileRoute("/_authenticated/os/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Centro de Operações — Valtro Labs" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function DashboardPage() {
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);

  useEffect(() => {
    const checkSecurity = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Se o usuário entrou via Google e ainda não marcou que tem senha local
      const isGoogleUser = user?.app_metadata?.provider === 'google' || 
                          user?.app_metadata?.providers?.includes('google') ||
                          user?.identities?.some(id => id.provider === 'google');
      
      const hasLocalPassword = user?.user_metadata?.has_local_password === true;

      if (isGoogleUser && !hasLocalPassword) {
        setShowSecurityWarning(true);
      } else {
        setShowSecurityWarning(false);
      }
    };
    checkSecurity();
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Centro de Operações"
        description="Gestão integrada de leads, briefings, projetos e portfólio."
      />
      
      {showSecurityWarning && (
        <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-500">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle className="font-semibold">Segurança da Conta</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span>
              Você está acessando via Google. Recomendamos configurar uma <strong>senha local</strong> para garantir o acesso em qualquer situação.
            </span>
            <Link 
              to="/os/configuracoes/seguranca" 
              className="text-sm font-bold flex items-center gap-1 hover:underline shrink-0"
            >
              Configurar agora <ArrowRight className="h-3 w-3" />
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-2xl border border-dashed border-border bg-card p-24 text-center">
        <h2 className="text-xl font-semibold mb-2">Painel de Operações</h2>
        <p className="text-muted-foreground">O dashboard completo está sendo carregado...</p>
      </div>
    </div>
  );
}
