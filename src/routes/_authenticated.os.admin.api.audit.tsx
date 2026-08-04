import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getAuditLogs } from '@/lib/os/api/audit.functions';
import { DataTable } from '@/components/app/data-table';
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

  const columns = [
    {
      accessorKey: 'created_at',
      header: 'Data',
      cell: ({ row }: any) => 
        format(new Date(row.original.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
    },
    {
      accessorKey: 'method',
      header: 'Método',
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.original.method}</Badge>
      ),
    },
    {
      accessorKey: 'path',
      header: 'Path',
      cell: ({ row }: any) => <code className="text-xs">{row.original.path}</code>,
    },
    {
      accessorKey: 'status_code',
      header: 'Status',
      cell: ({ row }: any) => {
        const code = row.original.status_code;
        const variant = code >= 200 && code < 300 ? 'success' : code >= 400 ? 'destructive' : 'secondary';
        return <Badge variant={variant as any}>{code}</Badge>;
      },
    },
    {
      accessorKey: 'application.display_name',
      header: 'Aplicação',
      cell: ({ row }: any) => row.original.application?.display_name || 'Unauthenticated',
    },
    {
      accessorKey: 'request_id',
      header: 'Request ID',
      cell: ({ row }: any) => <code className="text-[10px] text-muted-foreground">{row.original.request_id}</code>,
    },
    {
      accessorKey: 'duration_ms',
      header: 'Duração',
      cell: ({ row }: any) => `${row.original.duration_ms}ms`,
    },
    {
      accessorKey: 'ip',
      header: 'IP',
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={logs || []}
        searchPlaceholder="Buscar logs..."
      />
    </div>
  );
}
