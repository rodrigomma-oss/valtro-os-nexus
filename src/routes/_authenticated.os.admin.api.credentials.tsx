import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getCredentials, rotateCredentialFn, revokeCredentialFn } from '@/lib/os/api/credentials.functions';
import { DataTable } from '@/components/app/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, ShieldOff, Key, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { toast } from 'sonner';
import { useServerFn } from '@tanstack/react-start';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute('/_authenticated/os/admin/api/credentials')({
  component: CredentialsPage,
});

function CredentialsPage() {
  const { data: credentials } = useSuspenseQuery({
    queryKey: ['api-credentials'],
    queryFn: () => getCredentials(),
  });

  const rotateFn = useServerFn(rotateCredentialFn);
  const revokeFn = useServerFn(revokeCredentialFn);
  
  const [newCredential, setNewCredential] = useState<{ key_id: string, secret: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Segredo copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const columns = [
    {
      accessorKey: 'key_id',
      header: 'Key ID',
      cell: ({ row }: any) => <code className="text-xs">{row.original.key_id}</code>,
    },
    {
      accessorKey: 'application.display_name',
      header: 'Aplicação',
      cell: ({ row }: any) => row.original.application?.display_name,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => {
        const status = row.original.status;
        const variants: any = {
          active: 'success',
          revoked: 'destructive',
          expired: 'warning',
        };
        return (
          <Badge variant={variants[status] || 'outline'}>
            {status === 'active' ? 'Ativa' : status === 'revoked' ? 'Revogada' : status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'last_used_at',
      header: 'Último Uso',
      cell: ({ row }: any) => 
        row.original.last_used_at 
          ? format(new Date(row.original.last_used_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
          : 'Nunca',
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
        const cred = row.original;
        if (cred.status !== 'active') return null;

        return (
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              title="Rotacionar"
              onClick={async () => {
                if(confirm("Deseja rotacionar esta credencial? A atual será revogada e uma nova será gerada.")) {
                   try {
                     const result = await rotateFn({ data: { credentialId: cred.id, applicationId: cred.application_id } });
                     setNewCredential(result as any);
                   } catch (e) {
                     toast.error("Erro ao rotacionar");
                   }
                }
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-destructive"
              title="Revogar"
              onClick={async () => {
                if(confirm("Revogar esta credencial permanentemente?")) {
                  try {
                    await revokeFn({ data: { credentialId: cred.id, reason: "Revogação manual" } });
                    toast.success("Credencial revogada");
                  } catch (e) {
                    toast.error("Erro ao revogar");
                  }
                }
              }}
            >
              <ShieldOff className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={credentials || []}
        searchPlaceholder="Buscar credenciais..."
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
