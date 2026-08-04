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
        description={
          <div className="space-y-4">
            <p>A implementação técnica parece concluída.</p>
            <p>Antes da homologação definitiva da OPS-API-003D, preciso de evidências visuais reais da interface.</p>
            <p>Anexe capturas do Preview das seguintes telas:</p>
            <ol className="list-decimal ml-4 space-y-1">
              <li>Sidebar com o novo menu "API Pública".</li>
              <li>Dashboard de Aplicações.</li>
              <li>Modal de criação de Aplicação.</li>
              <li>Modal de edição.</li>
              <li>Tela de Credenciais.</li>
              <li>Modal de criação de Credencial.</li>
              <li>Modal exibindo o segredo apenas uma única vez.</li>
              <li>Modal de Rotação.</li>
              <li>Modal de Revogação.</li>
              <li>Timeline de Auditoria.</li>
              <li>Estado vazio.</li>
              <li>Estado de erro.</li>
              <li>Responsividade em Desktop.</li>
              <li>Responsividade em Mobile.</li>
            </ol>
            <p>Também confirme:</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>que a interface utiliza exclusivamente as Server Functions existentes;</li>
              <li>que nenhuma consulta acessa diretamente o Supabase;</li>
              <li>que o segredo desaparece definitivamente após o fechamento do modal;</li>
              <li>que a rotação preserva o histórico;</li>
              <li>que a revogação é irreversível;</li>
              <li>que todas as operações administrativas exigem MFA AAL2.</li>
            </ul>
            <p>Após a apresentação dessas evidências, a sprint poderá ser homologada.</p>
          </div>
        }
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
