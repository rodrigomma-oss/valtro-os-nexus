import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Bug as BugIcon, Eye, Plus, Search, SearchX } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { DataTable, type DataTableColumn } from "@/components/app/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BugCategoryLabel,
  BugEnvironmentBadge,
  BugSeverityBadge,
  BugStatusBadge,
} from "@/components/app/bug-badges";
import { NewBugDialog } from "@/components/app/new-bug-dialog";
import { listBugs } from "@/lib/os/bugs.functions";
import { listSaasProducts } from "@/lib/saas-products.functions";
import { listAssignableUsers } from "@/lib/leads.functions";
import { useCurrentRole } from "@/hooks/use-current-role";
import type { Bug, BugCategory, BugEnvironment, BugSeverity, BugStatus } from "@/types/bug";
import {
  BUG_CATEGORY_LABEL,
  BUG_CATEGORY_ORDER,
  BUG_ENVIRONMENT_LABEL,
  BUG_ENVIRONMENT_ORDER,
  BUG_SEVERITY_LABEL,
  BUG_SEVERITY_ORDER,
  BUG_STATUS_LABEL,
  BUG_STATUS_ORDER,
  parseBugSearch,
  translateBugError,
} from "@/lib/os/bugs-ui";

export const Route = createFileRoute("/_authenticated/os/atendimento/bugs/")({
  component: BugsList,
  head: () => ({
    meta: [
      { title: "Bugs — Valtro OS" },
      {
        name: "description",
        content:
          "Gestão de bugs dos produtos Valtro Labs: código, status, severidade, ambiente e responsável.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const ALL = "todos";
const PAGE_SIZE = 20;

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BugsList() {
  const navigate = useNavigate();
  const { canWrite, isLoading: roleLoading } = useCurrentRole();
  const listFn = useServerFn(listBugs);
  const productsFn = useServerFn(listSaasProducts);
  const usersFn = useServerFn(listAssignableUsers);

  const [term, setTerm] = useState("");
  const [status, setStatus] = useState<BugStatus | typeof ALL>(ALL);
  const [severity, setSeverity] = useState<BugSeverity | typeof ALL>(ALL);
  const [category, setCategory] = useState<BugCategory | typeof ALL>(ALL);
  const [environment, setEnvironment] = useState<BugEnvironment | typeof ALL>(ALL);
  const [product, setProduct] = useState<string>(ALL);
  const [owner, setOwner] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  const searchFilters = useMemo(() => parseBugSearch(term), [term]);
  const hasFilters =
    term.trim().length > 0 ||
    status !== ALL ||
    severity !== ALL ||
    category !== ALL ||
    environment !== ALL ||
    product !== ALL ||
    owner !== ALL;

  /** Qualquer alteração de filtro reinicia a paginação server-side. */
  const withReset =
    <T,>(setter: (v: T) => void) =>
    (value: T) => {
      setPage(1);
      setter(value);
    };

  const clearFilters = () => {
    setTerm("");
    setStatus(ALL);
    setSeverity(ALL);
    setCategory(ALL);
    setEnvironment(ALL);
    setProduct(ALL);
    setOwner(ALL);
    setPage(1);
  };

  const bugsQuery = useQuery({
    queryKey: [
      "bugs",
      { searchFilters, status, severity, category, environment, product, owner, page },
    ],
    queryFn: () =>
      listFn({
        data: {
          ...searchFilters,
          ...(status === ALL ? {} : { status }),
          ...(severity === ALL ? {} : { severity }),
          ...(category === ALL ? {} : { category }),
          ...(environment === ALL ? {} : { environment }),
          ...(product === ALL ? {} : { saas_product_id: product }),
          ...(owner === ALL ? {} : { owner_id: owner }),
          page,
          pageSize: PAGE_SIZE,
        },
      }),
  });

  const products = useQuery({
    queryKey: ["saas-products", "active"],
    queryFn: () => productsFn({ data: { activeOnly: true } }),
    staleTime: 60_000,
  });
  const users = useQuery({
    queryKey: ["assignable-users"],
    queryFn: () => usersFn(),
    staleTime: 60_000,
  });

  const items = bugsQuery.data?.items ?? [];
  const total = bugsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openBug = (id: string) => navigate({ to: "/os/atendimento/bugs/$id", params: { id } });

  const columns: DataTableColumn<Bug>[] = [
    {
      key: "code",
      header: "Código",
      render: (b) => (
        <Link
          to="/os/atendimento/bugs/$id"
          params={{ id: b.id }}
          onClick={(e) => e.stopPropagation()}
          className="whitespace-nowrap text-sm font-semibold text-primary hover:underline"
        >
          {b.code}
        </Link>
      ),
    },
    {
      key: "title",
      header: "Bug",
      render: (b) => (
        <div className="min-w-0 max-w-[280px]">
          <p className="truncate font-medium text-foreground" title={b.title}>
            {b.title}
          </p>
          <p className="truncate text-xs text-muted-foreground" title={b.description}>
            {b.description}
          </p>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (b) => <BugStatusBadge status={b.status} /> },
    {
      key: "severity",
      header: "Severidade",
      render: (b) => <BugSeverityBadge severity={b.severity} />,
    },
    {
      key: "category",
      header: "Categoria",
      render: (b) => <BugCategoryLabel category={b.category} />,
    },
    {
      key: "environment",
      header: "Ambiente",
      render: (b) => <BugEnvironmentBadge environment={b.environment} />,
    },
    {
      key: "product",
      header: "Produto",
      render: (b) => (
        <span className="text-sm text-muted-foreground">{b.product_name ?? "Não informado"}</span>
      ),
    },
    {
      key: "owner",
      header: "Responsável",
      render: (b) => (
        <span className="text-sm text-muted-foreground">{b.owner_name ?? "Não atribuído"}</span>
      ),
    },
    {
      key: "affected_version",
      header: "Versão afetada",
      render: (b) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {b.affected_version ?? "Não informada"}
        </span>
      ),
    },
    {
      key: "updated",
      header: "Atualização",
      render: (b) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {fmtDateTime(b.updated_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Ações",
      className: "text-right",
      render: (b) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            openBug(b.id);
          }}
        >
          Abrir
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-10 space-y-6">
      <PageHeader
        title="Bugs"
        description="Falhas técnicas identificadas nos produtos da Valtro Labs, com código próprio, severidade, ambiente e histórico completo de movimentações."
        actions={
          canWrite ? (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Novo bug
            </Button>
          ) : undefined
        }
      />

      {!roleLoading && !canWrite && (
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <Eye className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Seu perfil é somente leitura: você pode consultar bugs, histórico e anexos, mas não pode
            registrar ou alterar registros.
          </p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative md:col-span-2 xl:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por código, título ou Request ID…"
            value={term}
            onChange={(e) => {
              setPage(1);
              setTerm(e.target.value);
            }}
          />
        </div>

        <Select
          value={status}
          onValueChange={withReset((v: string) => setStatus(v as BugStatus | typeof ALL))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os status</SelectItem>
            {BUG_STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {BUG_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={severity}
          onValueChange={withReset((v: string) => setSeverity(v as BugSeverity | typeof ALL))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Severidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as severidades</SelectItem>
            {BUG_SEVERITY_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {BUG_SEVERITY_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={category}
          onValueChange={withReset((v: string) => setCategory(v as BugCategory | typeof ALL))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as categorias</SelectItem>
            {BUG_CATEGORY_ORDER.map((c) => (
              <SelectItem key={c} value={c}>
                {BUG_CATEGORY_LABEL[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={environment}
          onValueChange={withReset((v: string) => setEnvironment(v as BugEnvironment | typeof ALL))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Ambiente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os ambientes</SelectItem>
            {BUG_ENVIRONMENT_ORDER.map((e) => (
              <SelectItem key={e} value={e}>
                {BUG_ENVIRONMENT_LABEL[e]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={product} onValueChange={withReset(setProduct)}>
          <SelectTrigger>
            <SelectValue placeholder="Produto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os produtos</SelectItem>
            {(products.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={owner} onValueChange={withReset(setOwner)}>
          <SelectTrigger>
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os responsáveis</SelectItem>
            {(users.data ?? []).map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.full_name ?? "Sem nome"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="outline" onClick={clearFilters}>
            Limpar filtros
          </Button>
        )}
      </div>

      {bugsQuery.isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Não foi possível carregar os bugs"
          description={translateBugError(
            bugsQuery.error instanceof Error ? bugsQuery.error.message : null,
          )}
          action={
            <Button variant="outline" onClick={() => bugsQuery.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={items}
            loading={bugsQuery.isLoading}
            getRowId={(b) => b.id}
            onRowClick={(b) => openBug(b.id)}
            emptyState={
              hasFilters ? (
                <EmptyState
                  icon={SearchX}
                  title="Nenhum bug encontrado"
                  description="Ajuste a busca ou os filtros aplicados."
                  action={
                    <Button variant="outline" onClick={clearFilters}>
                      Limpar filtros
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={BugIcon}
                  title="Nenhum bug registrado"
                  description="Registre a primeira falha técnica para começar o acompanhamento."
                  action={
                    canWrite ? (
                      <Button onClick={() => setDialogOpen(true)}>
                        <Plus className="h-4 w-4" /> Novo bug
                      </Button>
                    ) : undefined
                  }
                />
              )
            }
          />

          {total > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-sm text-muted-foreground">
                {total} {total === 1 ? "bug" : "bugs"} · página {page} de {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || bugsQuery.isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || bugsQuery.isFetching}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <NewBugDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={openBug} />
    </div>
  );
}
