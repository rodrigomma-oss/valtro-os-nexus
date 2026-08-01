/**
 * Sprint 15.2.3C — Experiência de uso do Catálogo Comercial.
 *
 * A tela apresenta o catálogo em linguagem comercial: nenhum enum técnico,
 * nenhum JSON e nenhum estado vazio. Toda a leitura vem de `public.services`
 * (fonte única desde a Sprint 15.2.3A); nenhuma regra de negócio vive aqui.
 */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Search,
  SearchX,
  RefreshCw,
  Plus,
  Pencil,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { DataTable, type DataTableColumn } from "@/components/app/data-table";
import { StatCard } from "@/components/app/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  listServices,
  toggleServiceActive,
  type CatalogService,
} from "@/lib/services.functions";
import { getMyRoles } from "@/lib/leads.functions";
import {
  SERVICE_OFFER_TYPE_LABEL,
  SERVICE_OFFER_TYPE_BADGE_CLASS,
  describeServiceLimits,
  formatOnboardingPresence,
  formatServiceBilling,
  formatServiceObjective,
  formatServicePrice,
  serviceTypeLabel,
  summarizeCatalog,
} from "@/lib/service-catalog";
import { ServiceFormDialog } from "@/components/app/service-form-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/os/comercial/servicos")({
  component: ServicesCatalog,
  head: () => ({
    meta: [
      { title: "Catálogo de Serviços — CRM Valtro Labs" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function ServicesCatalog() {
  const qc = useQueryClient();
  const listFn = useServerFn(listServices);
  const toggleFn = useServerFn(toggleServiceActive);
  const rolesFn = useServerFn(getMyRoles);

  const [term, setTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogService | null>(null);

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

  const data = useMemo(() => servicesQuery.data ?? [], [servicesQuery.data]);
  const summary = useMemo(() => summarizeCatalog(data), [data]);

  const q = term.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      q.length === 0
        ? data
        : data.filter(
            (s) =>
              s.code.toLowerCase().includes(q) ||
              s.name.toLowerCase().includes(q) ||
              serviceTypeLabel(s.category).toLowerCase().includes(q) ||
              (s.objective ?? "").toLowerCase().includes(q) ||
              (s.description ?? "").toLowerCase().includes(q),
          ),
    [data, q],
  );

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (service: CatalogService) => {
    setEditing(service);
    setFormOpen(true);
  };

  const columns: DataTableColumn<CatalogService>[] = [
    {
      key: "service",
      header: "Serviço",
      className: "min-w-[240px]",
      render: (s) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{s.name}</p>
          <p className="text-[11px] text-muted-foreground/70">{s.code}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {serviceTypeLabel(s.category)}
          </p>
        </div>
      ),
    },
    {
      key: "objective",
      header: "Objetivo",
      className: "min-w-[220px] max-w-[320px]",
      render: (s) => (
        <p
          className={cn(
            "text-xs leading-relaxed line-clamp-3",
            s.objective?.trim() ? "text-foreground" : "text-muted-foreground italic",
          )}
        >
          {formatServiceObjective(s.objective)}
        </p>
      ),
    },
    {
      key: "billing",
      header: "Cobrança",
      className: "whitespace-nowrap",
      render: (s) => (
        <div>
          <p className="text-sm font-medium text-foreground">
            {formatServiceBilling(s.billing_type, s.billing_interval)}
          </p>
          <p
            className={cn(
              "text-xs",
              s.pricing_mode === "sob_consulta"
                ? "text-muted-foreground italic"
                : "text-muted-foreground",
            )}
          >
            {formatServicePrice(s.pricing_mode, s.default_price_cents)}
          </p>
        </div>
      ),
    },
    {
      key: "offer",
      header: "Oferta",
      className: "whitespace-nowrap",
      render: (s) => (
        <Badge
          variant="outline"
          className={SERVICE_OFFER_TYPE_BADGE_CLASS[s.offer_type]}
        >
          {SERVICE_OFFER_TYPE_LABEL[s.offer_type]}
        </Badge>
      ),
    },
    {
      key: "scope",
      header: "Escopo",
      className: "min-w-[160px]",
      render: (s) => (
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {describeServiceLimits(s.default_limits).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ),
    },
    {
      key: "onboarding",
      header: "Onboarding",
      className: "whitespace-nowrap",
      render: (s) => (
        <span className="text-xs text-muted-foreground">
          {formatOnboardingPresence(s.onboarding_template_key)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "whitespace-nowrap",
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
          <Badge
            variant="outline"
            className={
              s.active
                ? "border-success/30 bg-success/10 text-success"
                : "border-border bg-muted text-muted-foreground"
            }
          >
            {s.active ? "Ativo" : "Inativo"}
          </Badge>
        </div>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Ações</span>,
      className: "w-[64px] text-right",
      render: (s) => (
        <Button
          variant="ghost"
          size="icon"
          disabled={!isAdmin}
          onClick={() => openEdit(s)}
          aria-label={`Editar ${s.name}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-10 space-y-6">
      <PageHeader
        title="Catálogo de Serviços"
        description="Fonte única do portfólio comercial. Cada serviço define objetivo, cobrança, escopo e onboarding."
        actions={
          <Button onClick={openCreate} disabled={!isAdmin}>
            <Plus className="h-4 w-4" />
            Novo Serviço
          </Button>
        }
      />

      {!isAdmin && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
          Você tem acesso somente leitura. Alterações requerem perfil administrador.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total de serviços" value={summary.total} icon={Layers} />
        <StatCard label="Principais" value={summary.principal} />
        <StatCard label="Complementares" value={summary.complementar} />
        <StatCard label="Recorrentes" value={summary.recorrente} />
        <StatCard
          label="Ativos"
          value={summary.active}
          icon={CheckCircle2}
          trend="up"
          hint={`${summary.inactive} inativo(s)`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, código, categoria ou objetivo…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => servicesQuery.refetch()}
          disabled={servicesQuery.isFetching}
        >
          <RefreshCw
            className={cn("h-4 w-4", servicesQuery.isFetching && "animate-spin")}
          />
          Atualizar
        </Button>
      </div>

      {servicesQuery.isLoading ? (
        <DataTable columns={columns} data={[]} loading />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Nenhum serviço encontrado"
          description="Ajuste os termos de busca ou cadastre um novo serviço no catálogo."
        />
      ) : (
        <DataTable columns={columns} data={filtered} getRowId={(s) => s.id} />
      )}

      <ServiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        service={editing}
        catalog={data}
      />
    </div>
  );
}
