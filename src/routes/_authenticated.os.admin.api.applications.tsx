import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getApplications } from '@/lib/os/api/apps.functions';
import { DataTable } from '@/components/app/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Plus, Power, PowerOff, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { toast } from 'sonner';
import { useServerFn } from '@tanstack/react-start';
import { suspendApplicationFn, revokeApplicationFn } from '@/lib/os/api/apps.functions';

export const Route = createFileRoute('/_authenticated/os/admin/api/applications')({
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const { data: apps } = useSuspenseQuery({
    queryKey: ['api-applications'],
    queryFn: () => getApplications(),
  });

  const suspendFn = useServerFn(suspendApplicationFn);
  const revokeFn = useServerFn(revokeApplicationFn);

  const columns = [
    {
      accessorKey: 'display_name',
      header: 'Nome',
      cell: ({ row }: any) => (
        <div className="font-medium">{row.original.display_name}</div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => {
        const status = row.original.status;
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
      accessorKey: 'environment',
      header: 'Ambiente',
      cell: ({ row }: any) => (
        <Badge variant="outline" className="capitalize">
          {row.original.environment}
        </Badge>
      ),
    },
    {
      accessorKey: 'last_used_at',
      header: 'Último Uso',
      cell: ({ row }: any) => 
        row.original.last_used_at 
          ? format(new Date(row.original.last_used_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
          : 'Nunca utilizado',
    },
    {
      accessorKey: 'created_at',
      header: 'Criada em',
      cell: ({ row }: any) => 
        format(new Date(row.original.created_at), "dd/MM/yyyy", { locale: ptBR }),
    },
    {
      id: 'actions',
      header: 'Ações',
      cell: ({ row }: any) => {
        const app = row.original;
        return (
          <div className="flex items-center gap-2">
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
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Criar Aplicação
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={apps || []}
        searchPlaceholder="Buscar aplicações..."
      />
    </div>
  );
}
