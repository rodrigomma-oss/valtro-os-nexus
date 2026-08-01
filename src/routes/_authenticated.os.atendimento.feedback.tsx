import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquareHeart, Plus, Search, SearchX, Eye, AlertTriangle } from "lucide-react";
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
  FeedbackStatusBadge,
  FeedbackTypeLabel,
  FeedbackSourceBadge,
  FeedbackValueLabel,
  FeedbackInterestLabel,
} from "@/components/app/feedback-badges";
import { listFeedback } from "@/lib/os/feedback.functions";
import { listSaasProducts } from "@/lib/saas-products.functions";
import { listAssignableUsers } from "@/lib/leads.functions";
import { useCurrentRole } from "@/hooks/use-current-role";
import type { 
  Feedback, 
  FeedbackStatus, 
  FeedbackType, 
  FeedbackSource, 
  FeedbackPerceivedValue, 
  FeedbackSubscriptionInterest 
} from "@/types/feedback";
import {
  FEEDBACK_STATUS_LABEL,
  FEEDBACK_STATUS_ORDER,
  FEEDBACK_TYPE_LABEL,
  FEEDBACK_TYPE_ORDER,
  FEEDBACK_SOURCE_LABEL,
  FEEDBACK_SOURCE_ORDER,
  FEEDBACK_VALUE_LABEL,
  FEEDBACK_VALUE_ORDER,
  FEEDBACK_INTEREST_LABEL,
  FEEDBACK_INTEREST_ORDER,
  parseFeedbackSearch,
  translateFeedbackError,
} from "@/lib/os/feedback-ui";
import { NewFeedbackDialog } from "@/components/app/new-feedback-dialog";

export const Route = createFileRoute("/_authenticated/os/atendimento/feedback")({
  component: FeedbackList,
  head: () => ({
    meta: [
      { title: "Feedback — Valtro OS" },
      {
        name: "description",
        content:
          "Gestão de feedbacks dos participantes do Beta Fechado: elogios, sugestões, reclamações e análises de valor.",
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

function FeedbackList() {
  const navigate = useNavigate();
  const { canWrite, isLoading: roleLoading } = useCurrentRole();
  const listFn = useServerFn(listFeedback);
  const productsFn = useServerFn(listSaasProducts);
  const usersFn = useServerFn(listAssignableUsers);

  const [term, setTerm] = useState("");
  const [status, setStatus] = useState<FeedbackStatus | typeof ALL>(ALL);
  const [type, setType] = useState<FeedbackType | typeof ALL>(ALL);
  const [source, setSource] = useState<FeedbackSource | typeof ALL>(ALL);
  const [perceivedValue, setPerceivedValue] = useState<FeedbackPerceivedValue | typeof ALL>(ALL);
  const [interest, setInterest] = useState<FeedbackSubscriptionInterest | typeof ALL>(ALL);
  const [product, setProduct] = useState<string>(ALL);
  const [owner, setOwner] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  const searchFilters = useMemo(() => parseFeedbackSearch(term), [term]);
  const hasFilters =
    term.trim().length > 0 ||
    status !== ALL ||
    type !== ALL ||
    source !== ALL ||
    perceivedValue !== ALL ||
    interest !== ALL ||
    product !== ALL ||
    owner !== ALL;

  const withReset = <T,>(setter: (v: T) => void) => (value: T) => {
    setPage(1);
    setter(value);
  };

  const clearFilters = () => {
    setTerm("");
    setStatus(ALL);
    setType(ALL);
    setSource(ALL);
    setPerceivedValue(ALL);
    setInterest(ALL);
    setProduct(ALL);
    setOwner(ALL);
    setPage(1);
  };

  const feedbackQuery = useQuery({
    queryKey: [
      "feedback",
      { searchFilters, status, type, source, perceivedValue, interest, product, owner, page },
    ],
    queryFn: () =>
      listFn({
        data: {
          ...searchFilters,
          ...(status === ALL ? {} : { status }),
          ...(type === ALL ? {} : { type }),
          ...(source === ALL ? {} : { source }),
          ...(perceivedValue === ALL ? {} : { perceivedValue }),
          ...(interest === ALL ? {} : { interest }),
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

  const items = feedbackQuery.data?.items ?? [];
  const total = feedbackQuery.data?.total ?? 0;
  
  const openFeedback = (id: string) => navigate({ to: "/os/atendimento/feedback/$id", params: { id } });

  const columns: DataTableColumn<Feedback>[] = [
    {
      key: "code",
      header: "Código",
      render: (f) => (
        <Link
          to="/os/atendimento/feedback/$id"
          params={{ id: f.id }}
          onClick={(e) => e.stopPropagation()}
          className="whitespace-nowrap text-sm font-semibold text-primary hover:underline"
        >
          {f.code}
        </Link>
      ),
    },
    {
      key: "title",
      header: "Feedback",
      render: (f) => (
        <div className="min-w-0 max-w-[280px]">
          <p className="truncate font-medium text-foreground" title={f.title}>
            {f.title}
          </p>
          <p className="truncate text-xs text-muted-foreground" title={f.description}>
            {f.description}
          </p>
        </div>
      ),
    },
    { key: "type", header: "Tipo", render: (f) => <FeedbackTypeLabel type={f.type} /> },
    { key: "status", header: "Status", render: (f) => <FeedbackStatusBadge status={f.status} /> },
    { key: "value", header: "Valor", render: (f) => <FeedbackValueLabel value={f.perceived_value} /> },
    { key: "interest", header: "Assinatura", render: (f) => <FeedbackInterestLabel interest={f.subscription_interest} /> },
    {
      key: "product",
      header: "Produto",
      render: (f) => (
        <span className="text-sm text-muted-foreground">{f.product_name ?? "Não informado"}</span>
      ),
    },
    { key: "source", header: "Origem", render: (f) => <FeedbackSourceBadge source={f.source} /> },
    {
      key: "owner",
      header: "Responsável",
      render: (f) => (
        <span className="text-sm text-muted-foreground">{f.owner_name ?? "Não atribuído"}</span>
      ),
    },
    {
      key: "updated",
      header: "Atualização",
      render: (f) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {fmtDateTime(f.updated_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Ações",
      className: "text-right",
      render: (f) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            openFeedback(f.id);
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
        title="Feedback"
        description="Gestão de feedbacks dos participantes do Beta Fechado: elogios, sugestões, reclamações e análises de valor percebido."
        actions={
          canWrite ? (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Novo feedback
            </Button>
          ) : undefined
        }
      />

      {!roleLoading && !canWrite && (
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <Eye className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Seu perfil é somente leitura: você pode consultar feedbacks, histórico e anexos, mas não pode
            registrar ou alterar registros.
          </p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative md:col-span-2 xl:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por código, título, descrição ou e-mail…"
            value={term}
            onChange={(e) => {
              setPage(1);
              setTerm(e.target.value);
            }}
          />
        </div>

        <Select
          value={status}
          onValueChange={withReset((v: string) => setStatus(v as FeedbackStatus | typeof ALL))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os status</SelectItem>
            {FEEDBACK_STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {FEEDBACK_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={type}
          onValueChange={withReset((v: string) => setType(v as FeedbackType | typeof ALL))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os tipos</SelectItem>
            {FEEDBACK_TYPE_ORDER.map((t) => (
              <SelectItem key={t} value={t}>
                {FEEDBACK_TYPE_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={source}
          onValueChange={withReset((v: string) => setSource(v as FeedbackSource | typeof ALL))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as origens</SelectItem>
            {FEEDBACK_SOURCE_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {FEEDBACK_SOURCE_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={perceivedValue}
          onValueChange={withReset((v: string) => setPerceivedValue(v as FeedbackPerceivedValue | typeof ALL))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Valor percebido" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os valores</SelectItem>
            {FEEDBACK_VALUE_ORDER.map((v) => (
              <SelectItem key={v} value={v}>
                {FEEDBACK_VALUE_LABEL[v]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={interest}
          onValueChange={withReset((v: string) => setInterest(v as FeedbackSubscriptionInterest | typeof ALL))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Interesse em assinar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os interesses</SelectItem>
            {FEEDBACK_INTEREST_ORDER.map((i) => (
              <SelectItem key={i} value={i}>
                {FEEDBACK_INTEREST_LABEL[i]}
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
            {products.data?.map((p) => (
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
            {users.data?.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasFilters && (
        <div className="flex justify-start">
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <SearchX className="mr-2 h-4 w-4" /> Limpar filtros
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={items}
        loading={feedbackQuery.isLoading}
        onRowClick={(f) => openFeedback(f.id)}
        emptyState={
          <EmptyState
            icon={MessageSquareHeart}
            title={hasFilters ? "Nenhum feedback encontrado" : "Nenhum feedback registrado"}
            description={
              hasFilters
                ? "Tente ajustar seus filtros para encontrar o que procura."
                : "Ainda não há feedbacks registrados no sistema."
            }
            action={
              hasFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              ) : canWrite ? (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Novo feedback
                </Button>
              ) : undefined
            }
          />
        }
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Total de <strong>{total}</strong> feedbacks
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1 || feedbackQuery.isLoading}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={items.length < PAGE_SIZE || feedbackQuery.isLoading}
            onClick={() => setPage(page + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>

      <NewFeedbackDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
