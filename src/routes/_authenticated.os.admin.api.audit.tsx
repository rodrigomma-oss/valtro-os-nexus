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
      key: 'method',
      header: 'Método',
      render: (log) => (
        <Badge variant="outline">{log.method}</Badge>
      ),
    },
    {
      key: 'path',
      header: 'Path',
      render: (log) => <code className="text-xs">{log.path}</code>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (log) => {
        const code = log.status_code;
        const variant = code >= 200 && code < 300 ? 'success' : code >= 400 ? 'destructive' : 'secondary';
        return <Badge variant={variant as any}>{code}</Badge>;
      },
    },
    {
      key: 'app',
      header: 'Aplicação',
      render: (log) => log.application?.display_name || 'Unauthenticated',
    },
    {
      key: 'request_id',
      header: 'Request ID',
      render: (log) => <code className="text-[10px] text-muted-foreground">{log.request_id}</code>,
    },
    {
      key: 'duration',
      header: 'Duração',
      render: (log) => `${log.duration_ms}ms`,
    },
    {
      key: 'ip',
      header: 'IP',
      render: (log) => log.ip || '-',
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
