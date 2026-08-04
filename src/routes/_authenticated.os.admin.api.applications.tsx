import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getApplications } from '@/lib/os/api/apps.functions';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Power, PowerOff, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useServerFn } from '@tanstack/react-start';
import { suspendApplicationFn, revokeApplicationFn } from '@/lib/os/api/apps.functions';
import { NewAppDialog } from '@/components/os/api/apps/NewAppDialog';

export const Route = createFileRoute('/_authenticated/os/admin/api/applications')({
  component: ApplicationsPage,
});

function ApplicationsPage() {
  console.log("Rendering ApplicationsPage");
  const { data: apps, error, isLoading } = useSuspenseQuery({
    queryKey: ['api-applications'],
    queryFn: () => getApplications(),
  });

  if (error) {
    console.error("Query error:", error);
    throw error;
  }

  const suspendFn = useServerFn(suspendApplicationFn);
  const revokeFn = useServerFn(revokeApplicationFn);

  const columns: DataTableColumn<any>[] = [
    {
      key: 'name',
      header: 'Nome',
      render: (app) => (
        <div className="font-medium">{app.display_name}</div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (app) => {
        const status = app.status;
        const variants: any = {
          active: 'success',
          suspended: 'warning',
          revoked: 'destructive',
          pending: 'secondary',
        };
        return (
          <Badge variant={variants[status] || 'outline'}>
            {status === 'active' ? 'Ativa' : status === 'suspended' ? 'Suspensa' : status === 'revoked' ? 'Revogada' : status}
          </Badge>
        );
      },
    },
    {
      key: 'environment',
      header: 'Ambiente',
      render: (app) => (
        <Badge variant="outline" className="capitalize">
          {app.environment}
        </Badge>
      ),
    },
    {
      key: 'last_used',
      header: 'Último Uso',
      render: (app) => 
        app.last_used_at 
          ? format(new Date(app.last_used_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
          : 'Nunca utilizado',
    },
    {
      key: 'created_at',
      header: 'Criada em',
      render: (app) => (
        <div className="flex flex-col">
          <span>{format(new Date(app.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
          <span className="text-xs text-muted-foreground">
            por {app.created_by_user?.full_name || 'Sistema'}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      className: "text-right",
      render: (app) => {
        return (
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="icon" title="Visualizar">
              <Eye className="h-4 w-4" />
            </Button>
            {app.status === 'active' ? (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-warning"
                title="Suspender"
                onClick={async () => {
                  try {
                    await suspendFn({ data: { id: app.id } });
                    toast.success("Aplicação suspensa");
                  } catch (e) {
                    toast.error("Erro ao suspender");
                  }
                }}
              >
                <PowerOff className="h-4 w-4" />
              </Button>
            ) : app.status === 'suspended' ? (
               <Button 
                variant="ghost" 
                size="icon" 
                className="text-success"
                title="Reativar"
                onClick={() => toast.info("Funcionalidade de reativação em breve")}
              >
                <Power className="h-4 w-4" />
              </Button>
            ) : null}
            {app.status !== 'revoked' && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-destructive"
                title="Revogar"
                onClick={async () => {
                   if(confirm("Tem certeza que deseja revogar permanentemente esta aplicação? Esta operação é irreversível.")) {
                     try {
                        await revokeFn({ data: { id: app.id, reason: "Revogação manual via painel admin" } });
                        toast.success("Aplicação revogada permanentemente");
                     } catch (e) {
                        toast.error("Erro ao revogar");
                     }
                   }
                }}
              >
                <ShieldAlert className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <NewAppDialog />
      </div>
      <DataTable
        columns={columns}
        data={apps || []}
      />
    </div>
  );
}
