import { createFileRoute } from '@tanstack/react-router';
import { getApplications } from '@/lib/os/api/apps.functions';
import { NewAppDialog } from '@/components/os/api/apps/NewAppDialog';
import { EditAppDialog } from '@/components/os/api/apps/EditAppDialog';
import { SuspendAppDialog } from '@/components/os/api/apps/SuspendAppDialog';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { Search, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/_authenticated/os/admin/api/applications')({
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const [search, setSearch] = useState('');

  const { data: apps, error, isLoading } = useQuery({
    queryKey: ['api-applications'],
    queryFn: () => getApplications(),
  });

  const { data: products } = useQuery({
    queryKey: ['saas-products'],
    queryFn: async () => {
      const { data } = await supabase.from("saas_products").select("id, name");
      return data || [];
    }
  });

  const productMap = useMemo(() => {
    return (products || []).reduce((acc: any, p: any) => ({ ...acc, [p.id]: p.name }), {});
  }, [products]);

  const filteredApps = useMemo(() => {
    if (!apps) return [];
    if (!search) return apps;
    const lowerSearch = search.toLowerCase();
    return apps.filter((app: any) => 
      app.display_name?.toLowerCase().includes(lowerSearch) || 
      app.name?.toLowerCase().includes(lowerSearch)
    );
  }, [apps, search]);

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
      key: 'product',
      header: 'Produto Associado',
      render: (app) => (
        <div className="flex items-center gap-2">
          {app.saas_product_id ? (
            <>
              <Package className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {productMap[app.saas_product_id] || 'Carregando...'}
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground italic">Global</span>
          )}
        </div>
      ),
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
      key: 'last_used',
      header: 'Último uso',
      render: (app) => 
        app.last_used_at 
          ? format(new Date(app.last_used_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
          : 'Nunca utilizado',
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (app) => (
        <div className="flex items-center gap-2">
          <EditAppDialog application={app} />
          <SuspendAppDialog application={app} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <NewAppDialog />
      </div>

      {filteredApps.length === 0 ? (
        <div className="border rounded-lg border-dashed p-12 text-center">
          <h3 className="text-lg font-semibold">Nenhuma aplicação encontrada</h3>
          <p className="text-sm text-muted-foreground">
            {search ? 'Tente ajustar sua busca.' : 'Ainda não existem aplicações registradas.'}
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredApps}
        />
      )}
    </div>
  );
}
