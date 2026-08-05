import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCredentials, rotateCredentialFn, revokeCredentialFn } from '@/lib/os/api/credentials.functions';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, ShieldOff, Search, Plus, AlertCircle, Inbox } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useServerFn } from '@tanstack/react-start';
import { NewCredentialDialog } from '@/components/os/api/credentials/NewCredentialDialog';
import { SecretDisplayDialog } from '@/components/os/api/credentials/SecretDisplayDialog';
import { RotateCredentialDialog } from '@/components/os/api/credentials/RotateCredentialDialog';
import { RevokeCredentialDialog } from '@/components/os/api/credentials/RevokeCredentialDialog';

export const Route = createFileRoute('/_authenticated/os/admin/api/credentials')({
  component: CredentialsPage,
});

function CredentialsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  
  // Modals state
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [newSecretData, setNewSecretData] = useState<{ key_id: string; secret: string } | null>(null);
  const [rotateTarget, setRotateTarget] = useState<any | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: credentials, isLoading, error } = useQuery({
    queryKey: ['api-credentials'],
    queryFn: () => getCredentials(),
    refetchOnWindowFocus: false, // Evita refetch ao alternar abas durante cópia de segredo
  });

  const rotateFn = useServerFn(rotateCredentialFn);
  const revokeFn = useServerFn(revokeCredentialFn);

  const filteredCredentials = useMemo(() => {
    if (!credentials) return [];
    const term = search.toLowerCase();
    return credentials.filter(c => 
      (c.key_id?.toLowerCase().includes(term) ?? false) || 
      (c.application?.display_name?.toLowerCase().includes(term) ?? false)
    );
  }, [credentials, search]);

  const handleRotate = async () => {
    if (!rotateTarget) return;
    setIsSubmitting(true);
    try {
      const result = await rotateFn({ 
        data: { 
          credentialId: rotateTarget.id, 
          applicationId: rotateTarget.application_id 
        } 
      });
      setNewSecretData(result as { key_id: string; secret: string });
      queryClient.invalidateQueries({ queryKey: ['api-credentials'] });
      setRotateTarget(null);
      toast.success("Credencial rotacionada com sucesso");
    } catch (e) {
      toast.error("Erro ao rotacionar credencial");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setIsSubmitting(true);
    try {
      await revokeFn({ 
        data: { 
          credentialId: revokeTarget.id, 
          reason: "Revogação manual via painel administrativo" 
        } 
      });
      queryClient.invalidateQueries({ queryKey: ['api-credentials'] });
      setRevokeTarget(null);
      toast.success("Credencial revogada com sucesso");
    } catch (e) {
      toast.error("Erro ao revogar credencial");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: DataTableColumn<any>[] = [
    {
      key: 'key_id',
      header: 'Key ID',
      render: (cred) => <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{cred.key_id || '—'}</code>,
    },
    {
      key: 'app',
      header: 'Aplicação',
      render: (cred) => (
        <div className="flex flex-col">
          <span className="font-medium">{cred.application?.display_name || 'Desconhecida'}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{cred.application?.environment || '—'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (cred) => {
        const status = cred.status;
        const variants: any = {
          active: 'success',
          revoked: 'destructive',
          expired: 'warning',
        };
        return (
          <Badge variant={variants[status] || 'outline'} className="capitalize">
            {status === 'active' ? 'Ativa' : status === 'revoked' ? 'Revogada' : status}
          </Badge>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Data de Criação',
      render: (cred) => cred.created_at ? format(new Date(cred.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '—',
    },
    {
      key: 'last_used',
      header: 'Último Uso',
      render: (cred) => 
        cred.last_used_at 
          ? format(new Date(cred.last_used_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
          : <span className="text-muted-foreground italic">Nunca</span>,
    },
    {
      key: 'last_ip',
      header: 'Último IP',
      render: (cred) => <span className="text-muted-foreground font-mono text-xs">{cred.last_ip || '—'}</span>,
    },
    {
      key: 'rotation_history',
      header: 'Histórico',
      render: (cred) => (
        <div className="flex flex-col text-[10px] text-muted-foreground italic">
          <span>Versão: {cred.version || 1}</span>
          {cred.rotated_at && (
            <span>Rotacionada em: {format(new Date(cred.rotated_at), "dd/MM/yy")}</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      className: "text-right",
      render: (cred) => {
        if (cred.status !== 'active') return null;

        return (
          <div className="flex items-center justify-end gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 gap-2"
              onClick={() => setRotateTarget(cred)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Rotacionar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 gap-2 text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20"
              onClick={() => setRevokeTarget(cred)}
            >
              <ShieldOff className="h-3.5 w-3.5" />
              Revogar
            </Button>
          </div>
        );
      },
    },
  ];

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-destructive/5 rounded-lg border border-destructive/10">
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <h3 className="text-lg font-semibold">Erro ao carregar credenciais</h3>
        <p className="text-muted-foreground max-w-md mt-2">
          Não foi possível recuperar a lista de credenciais da API. Por favor, tente novamente mais tarde.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => queryClient.invalidateQueries({ queryKey: ['api-credentials'] })}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const emptyState = (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-muted/20 rounded-lg border border-dashed">
      <Inbox className="h-10 w-10 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold">Nenhuma credencial</h3>
      <p className="text-muted-foreground max-w-md mt-2">
        {search ? "Nenhuma credencial corresponde à sua busca." : "Ainda não existem credenciais geradas para as aplicações."}
      </p>
      {!search && (
        <Button variant="outline" className="mt-6" onClick={() => setIsNewDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Gerar primeira credencial
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por Key ID ou Aplicação..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button className="w-full sm:w-auto gap-2" onClick={() => setIsNewDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Nova Credencial
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filteredCredentials}
        loading={isLoading}
        emptyState={emptyState}
      />

      {/* Modals */}
      <NewCredentialDialog 
        open={isNewDialogOpen} 
        onOpenChange={setIsNewDialogOpen}
        onSuccess={(data) => setNewSecretData(data)}
      />

      <SecretDisplayDialog 
        data={newSecretData} 
        onClose={() => {
          setNewSecretData(null);
          queryClient.invalidateQueries({ queryKey: ['api-credentials'] });
        }}
      />

      <RotateCredentialDialog
        open={!!rotateTarget}
        onOpenChange={(open) => !open && setRotateTarget(null)}
        onConfirm={handleRotate}
        isSubmitting={isSubmitting}
      />

      <RevokeCredentialDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        onConfirm={handleRevoke}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
