import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, SearchX, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { DataTable, type DataTableColumn } from "@/components/app/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  listServices,
  toggleServiceActive,
  type CatalogService,
} from "@/lib/services.functions";
import { getMyRoles } from "@/lib/leads.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/crm/servicos")({
  component: ServicesCatalog,
  head: () => ({
    meta: [
      { title: "Catálogo de Serviços — CRM Valtro Labs" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function formatPrice(cents: number | null): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatLimits(limits: Record<string, string | number | boolean | null>): string {
  const keys = Object.keys(limits ?? {});
  if (keys.length === 0) return "—";
  return keys.map((k) => `${k}: ${String(limits[k])}`).join(" · ");
}

function ServicesCatalog() {
  const qc = useQueryClient();
  const listFn = useServerFn(listServices);
  const toggleFn = useServerFn(toggleServiceActive);
  const rolesFn = useServerFn(getMyRoles);

  const [term, setTerm] = useState("");

  const rolesQuery = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => rolesFn(),
    staleTime: 60_000,
  });
  const isAdmin = rolesQuery.data?.isAdmin ?? false;

  const servicesQuery = useQuery({
    queryKey: ["services-catalog"],
    queryFn: () => listFn(),
  });

  const toggle = useMutation({
    mutationFn: (vars: { id: string; active: boolean }) =>
      toggleFn({ data: vars }),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["services-catalog"] });
      toast.success(vars.active ? "Serviço ativado." : "Serviço desativado.");
    },
    onError: (err: Error) => toast.error(err.message ?? "Falha ao atualizar."),
  });

  const data = servicesQuery.data ?? [];
  const q = term.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      q.length === 0
        ? data
        : data.filter(
            (s) =>
              s.code.toLowerCase().includes(q) ||
              s.name.toLowerCase().includes(q) ||
              (s.description ?? "").toLowerCase().includes(q),
          ),
    [data, q],
  );

  const columns: DataTableColumn<CatalogService>[] = [
    {
      key: "service",
      header: "Serviço",
      render: (s) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{s.name}</p>
          <p className="text-xs font-mono text-muted-foreground">{s.code}</p>
          {s.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {s.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "category",
      header: "Categoria",
      render: (s) => (
        <Badge variant="outline" className="font-mono text-[10px]">
          {s.category}
        </Badge>
      ),
    },
    {
      key: "billing",
      header: "Cobrança",
      render: (s) => (
        <Badge
          variant="outline"
          className={cn(
            "capitalize",
            s.billing_type === "recorrente"
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-slate-50 text-slate-700 border-slate-200",
          )}
        >
          {s.billing_type}
        </Badge>
      ),
    },
    {
      key: "price",
      header: "Preço padrão",
      render: (s) => (
        <div className="text-sm">
          <span
            className={cn(
              "font-medium",
              s.default_price_cents == null && "text-amber-600",
            )}
          >
            {formatPrice(s.default_price_cents)}
          </span>
          {s.default_price_cents == null && (
            <p className="text-[10px] text-amber-600 mt-0.5">
              Aguardando definição comercial
            </p>
          )}
        </div>
      ),
    },
    {
      key: "limits",
      header: "Limites",
      render: (s) => (
        <span className="text-xs text-muted-foreground font-mono">
          {formatLimits(s.default_limits)}
        </span>
      ),
    },
    {
      key: "templates",
      header: "Templates",
      render: (s) => (
        <div className="text-xs text-muted-foreground space-y-0.5">
          <div>
            <span className="text-[10px] uppercase tracking-wider">Briefing:</span>{" "}
            {s.briefing_template_key ?? "—"}
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider">Onboarding:</span>{" "}
            {s.onboarding_template_key ?? "—"}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (s) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={s.active}
            disabled={!isAdmin || toggle.isPending}
            onCheckedChange={(checked) =>
              toggle.mutate({ id: s.id, active: checked })
            }
            aria-label={s.active ? "Desativar serviço" : "Ativar serviço"}
          />
          <span
            className={cn(
              "text-xs font-medium",
              s.active ? "text-emerald-700" : "text-muted-foreground",
            )}
          >
            {s.active ? "Ativo" : "Inativo"}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo de Serviços"
        description="Fonte única do portfólio comercial (SKUs). A categoria continua governada pela taxonomia service_type."
      />

      {!isAdmin && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Você tem acesso somente leitura. Alterações requerem perfil administrador.
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nome ou descrição…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <button
          type="button"
          onClick={() => servicesQuery.refetch()}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <RefreshCw
            className={cn("h-4 w-4", servicesQuery.isFetching && "animate-spin")}
          />
          Atualizar
        </button>
      </div>

      {servicesQuery.isLoading ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Carregando catálogo…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Nenhum serviço encontrado"
          description="Ajuste os termos de busca ou aguarde o cadastro de novos SKUs."
        />
      ) : (
        <DataTable columns={columns} data={filtered} getRowId={(s) => s.id} />
      )}
    </div>
  );
}
