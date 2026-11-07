import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getAuditLogs } from '@/lib/os/api/audit.functions';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const Route = createFileRoute('/_authenticated/os/admin/api/audit')({
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const { data: logs } = useSuspenseQuery({
    queryKey: ['api-audit-logs'],
    queryFn: () => getAuditLogs(),
  });

  const columns: DataTableColumn<any>[] = [
    {
      key: 'created_at',
      header: 'Data',
      render: (log) => 
        format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
    },
    {
      key: 'event',
      header: 'Evento',
      render: (log) => {
        const isApi = !!log.method;
        return (
          <div className="flex flex-col">
            <span className="font-medium text-xs">
              {isApi ? `${log.method} ${log.path}` : 'Ação Administrativa'}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {log.request_id || 'ID N/A'}
            </span>
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (log) => {
        const code = log.status_code;
        if (!code) return <Badge variant="outline">LOG</Badge>;
        const variant = code >= 200 && code < 300 ? 'success' : code >= 400 ? 'destructive' : 'secondary';
        return <Badge variant={variant as any}>{code}</Badge>;
      },
    },
    {
      key: 'actor',
      header: 'Ator',
      render: (log) => (
        <div className="flex flex-col">
          <span className="text-xs">
            {log.application?.display_name || 'Sistema'}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {log.application ? 'Aplicação' : 'Ação Interna'}
          </span>
        </div>
      ),
    },

    {
      key: 'details',
      header: 'Duração / IP',
      render: (log) => (
        <div className="text-[10px] text-muted-foreground">
          {log.duration_ms ? `${log.duration_ms}ms` : '-'} | {log.ip || '-'}
        </div>
      ),
    },
  ];


  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={logs || []}
      />
    </div>
  );
}
