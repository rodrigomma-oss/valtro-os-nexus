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
            <p>O Preview apresenta:</p>
            <p className="font-mono text-destructive">Could not find a relationship between api_applications and profiles</p>
            <p>Identifique:</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>Qual query Supabase está sendo executada.</li>
              <li>Qual relacionamento ela espera.</li>
              <li>Se existe Foreign Key correspondente.</li>
              <li>Se a migration foi aplicada ao banco do Preview.</li>
              <li>Se o relacionamento realmente deve existir.</li>
            </ul>
            <p className="font-semibold text-destructive">Não criar joins implícitos.</p>
            <p className="font-semibold text-destructive">Não contornar com consultas duplicadas.</p>
            <p className="font-semibold text-destructive">Corrigir a causa raiz.</p>
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
