import { createFileRoute } from "@tanstack/react-router";
import { DashboardView } from "@/modules/os/dashboard/views/dashboard-view";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/os/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard — Valtro OS" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function DashboardPage() {
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);

  useEffect(() => {
    const checkSecurity = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Se logado via Google e não houver indicação de senha nos metadados 
      // (Supabase não expõe a existência de senha diretamente no app_metadata de forma padrão,
      // mas podemos inferir ou simplesmente sugerir para usuários Google).
      if (user?.app_metadata?.provider === 'google' || user?.app_metadata?.providers?.includes('google')) {
        // Como não podemos ter certeza absoluta no cliente sem tentar um erro,
        // mostramos o aviso como uma "Recomendação de Segurança" para usuários Google.
        setShowSecurityWarning(true);
      }
    };
    checkSecurity();
  }, []);

  return (
    <div className="space-y-6">
      {showSecurityWarning && (
        <div className="px-6 pt-6">
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
        </div>
      )}
      <DashboardView />
    </div>
  );
}
