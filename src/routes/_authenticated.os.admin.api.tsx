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
        description="Gerencie as aplicações consumidoras, credenciais de acesso e audite o uso da API pública do Valtro OS."
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
