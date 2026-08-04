import { createFileRoute } from '@tanstack/react-router';
import { getApplications } from '@/lib/os/api/apps.functions';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Power, PowerOff, ShieldAlert, Key } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useServerFn } from '@tanstack/react-start';
import { suspendApplicationFn, revokeApplicationFn } from '@/lib/os/api/apps.functions';
import { createCredentialFn } from '@/lib/os/api/credentials.functions';
import { NewAppDialog } from '@/components/os/api/apps/NewAppDialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Copy, Check, ShieldOff } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/os/admin/api/applications')({
  component: ApplicationsPage,
});


function ApplicationsPage() {
  const queryClient = useQueryClient();
  const { data: apps, error, isLoading } = useQuery({
    queryKey: ['api-applications'],
    queryFn: () => getApplications(),
  });

  const suspendFn = useServerFn(suspendApplicationFn);
  const revokeFn = useServerFn(revokeApplicationFn);
  const createCredFn = useServerFn(createCredentialFn);

  const [newCredential, setNewCredential] = useState<{ key_id: string, secret: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Segredo copiado!");
    setTimeout(() => setCopied(false), 2000);
  };


  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando aplicações...</div>;
  if (error) return <div className="p-8 text-center text-destructive">Erro ao carregar aplicações.</div>;

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
            <Button 
              variant="ghost" 
              size="icon" 
              title="Visualizar Detalhes"
              onClick={() => toast.info("Detalhes da aplicação em breve")}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {app.status === 'active' && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-primary"
                title="Gerar Credencial"
                onClick={async () => {
                   try {
                     const result = await createCredFn({ data: { applicationId: app.id } });
                     setNewCredential(result as any);
                     queryClient.invalidateQueries({ queryKey: ['api-credentials'] });
                     queryClient.invalidateQueries({ queryKey: ['api-audit-logs'] });
                     toast.success("Nova credencial gerada");
                   } catch (e) {
                     toast.error("Erro ao gerar credencial");
                   }
                }}
              >
                <Key className="h-4 w-4" />
              </Button>
            )}
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
                    queryClient.invalidateQueries({ queryKey: ['api-applications'] });
                    queryClient.invalidateQueries({ queryKey: ['api-audit-logs'] });
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
                        queryClient.invalidateQueries({ queryKey: ['api-applications'] });
                        queryClient.invalidateQueries({ queryKey: ['api-audit-logs'] });
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

      <Dialog open={!!newCredential} onOpenChange={(open) => !open && setNewCredential(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <Key className="h-5 w-5" />
              Nova Credencial Gerada
            </DialogTitle>
            <DialogDescription>
              Este segredo não poderá ser visualizado novamente. Guarde-o em um local seguro.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Key ID</label>
              <div className="flex items-center gap-2 bg-muted p-2 rounded border font-mono text-sm">
                <span className="flex-1 truncate">{newCredential?.key_id}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Secret Key</label>
              <div className="flex items-center gap-2 bg-muted p-2 rounded border font-mono text-sm">
                <span className="flex-1 truncate">{newCredential?.secret}</span>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(newCredential?.secret || '')}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg flex gap-3 items-start">
              <ShieldOff className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-xs text-destructive leading-relaxed">
                <strong>AVISO DE SEGURANÇA:</strong> Se você perder este segredo, terá que gerar uma nova credencial. Nunca compartilhe esta chave por canais inseguros.
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setNewCredential(null)}>Entendi, salvei a chave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  );
}