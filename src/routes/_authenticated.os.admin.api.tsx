import { createFileRoute, Outlet } from '@tanstack/react-router';
import { PageHeader } from '@/components/app/page-header';
import { Server } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/os/admin/api')({
  component: ApiAdminLayout,
});

function ApiAdminLayout() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="API Pública"
        description="Gestão de aplicações, credenciais e auditoria da API externa."
        icon={Server}
        breadcrumbs={[
          { label: 'Administração', to: '/os/admin/usuarios' },
          { label: 'API Pública' },
        ]}
      />
      <Outlet />
    </div>
  );
}
