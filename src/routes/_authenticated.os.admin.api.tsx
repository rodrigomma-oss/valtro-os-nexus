import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router';
import { PageHeader } from '@/components/app/page-header';
import { cn } from '@/lib/utils';
import { ShieldCheck, Key, History } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/os/admin/api')({
  component: ApiAdminLayout,
});

function ApiAdminLayout() {
  const location = useLocation();

  const tabs = [
    { name: 'Aplicações', href: '/os/admin/api/applications', icon: ShieldCheck },
    { name: 'Credenciais', href: '/os/admin/api/credentials', icon: Key },
    { name: 'Auditoria', href: '/os/admin/api/audit', icon: History },
  ];

  return (
    <div className="flex flex-col h-full w-full">
      <PageHeader 
        title="API Pública" 
        description="Gerenciamento de integrações externas, segurança HMAC e auditoria."
      />
      
      <div className="flex flex-col flex-1 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border rounded-lg p-4 space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Aplicações Ativas</span>
            <div className="text-2xl font-bold">--</div>
          </div>
          <div className="bg-card border rounded-lg p-4 space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Requisições (24h)</span>
            <div className="text-2xl font-bold">--</div>
          </div>
          <div className="bg-card border rounded-lg p-4 space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Falhas de Auth</span>
            <div className="text-2xl font-bold text-destructive">--</div>
          </div>
        </div>

        <nav className="flex items-center gap-1 border-b pb-px">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                to={tab.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
                  isActive 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.name}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1 min-h-0 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>

  );
}