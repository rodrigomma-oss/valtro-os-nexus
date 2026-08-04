import { createFileRoute, Outlet } from '@tanstack/react-router';
import { PageHeader } from '@/components/app/page-header';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useRouterState } from "@tanstack/react-router";

export const Route = createFileRoute('/_authenticated/os/admin/api')({
  component: ApiAdminLayout,
});

function ApiAdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  
  const currentTab = pathname.split('/').pop() || 'applications';

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Pública"
        description="A implementação técnica parece concluída. Antes da homologação definitiva da OPS-API-003D, preciso de evidências visuais reais da interface. Anexe capturas do Preview das seguintes telas: 1. Sidebar, 2. Dashboard, 3. Criação de App, 4. Edição, 5. Credenciais, 6. Criação de Credencial, 7. Segredo Único, 8. Rotação, 9. Revogação, 10. Auditoria, 11. Vazio, 12. Erro, 13. Desktop, 14. Mobile. Confirme uso de Server Functions, sem acesso direto ao DB, segredo temporário, histórico de rotação, irreversibilidade da revogação e MFA AAL2."
      />
      
      <Tabs value={currentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
          <TabsTrigger value="applications" asChild>
            <Link to="/os/admin/api/applications">Aplicações</Link>
          </TabsTrigger>
          <TabsTrigger value="credentials" asChild>
            <Link to="/os/admin/api/credentials">Credenciais</Link>
          </TabsTrigger>
          <TabsTrigger value="audit" asChild>
            <Link to="/os/admin/api/audit">Auditoria</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Outlet />
    </div>
  );
}
