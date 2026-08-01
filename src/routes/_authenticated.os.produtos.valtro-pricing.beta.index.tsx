import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FlaskConical, Plus, Search, SearchX, Eye } from "lucide-react";
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
  BetaParticipantStatusBadge,
  BetaParticipantInterestBadge,
} from "@/components/app/beta-participant-badges";
import { NewBetaParticipantDialog } from "@/components/app/new-beta-participant-dialog";
import {
  listParticipants,
  listBetaProgramsForParticipants,
} from "@/lib/os/beta-participants.functions";
import {
  BETA_PARTICIPANT_STATUS_LABEL,
  BETA_PARTICIPANT_STATUS_ORDER,
  BETA_PARTICIPANT_INTEREST_LABEL,
  BETA_PARTICIPANT_INTEREST_ORDER,
  parseBetaParticipantSearch,
} from "@/lib/os/beta-participants-ui";
import { useCurrentRole } from "@/hooks/use-current-role";
import type {
  BetaParticipant,
  BetaParticipantStatus,
  BetaParticipantInterest,
} from "@/types/beta-participant";

export const Route = createFileRoute("/_authenticated/os/produtos/valtro-pricing/beta/")({
  component: BetaParticipantsList,
  head: () => ({
    meta: [
      { title: "Participantes do Beta — Valtro Pricing — Valtro OS" },
      {
        name: "description",
        content:
          "Gestão dos participantes do Beta Fechado do Valtro Pricing: convites, aceites, ativação, inativação e conversão.",
      },
      { property: "og:title", content: "Participantes do Beta — Valtro Pricing" },
      {
        property: "og:description",
        content: "Controle interno dos participantes do Beta Fechado do Valtro Pricing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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

function BetaParticipantsList() {
  const navigate = useNavigate();
  const { canWrite, isLoading: roleLoading } = useCurrentRole();
  const listFn = useServerFn(listParticipants);
  const programsFn = useServerFn(listBetaProgramsForParticipants);

  const [term, setTerm] = useState("");
  const [status, setStatus] = useState<BetaParticipantStatus | typeof ALL>(ALL);
  const [interest, setInterest] = useState<BetaParticipantInterest | typeof ALL>(ALL);
  const [program, setProgram] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  const searchFilters = useMemo(() => parseBetaParticipantSearch(term), [term]);
  const hasFilters =
    term.trim().length > 0 || status !== ALL || interest !== ALL || program !== ALL;

  const withReset = <T,>(setter: (v: T) => void) => (value: T) => {
    setPage(1);
    setter(value);
  };

  const clearFilters = () => {
    setTerm("");
    setStatus(ALL);
    setInterest(ALL);
    setProgram(ALL);
    setPage(1);
  };

  const participantsQuery = useQuery({
    queryKey: ["beta-participants", { searchFilters, status, interest, program, page }],
    queryFn: () =>
      listFn({
        data: {
          ...searchFilters,
          ...(status === ALL ? {} : { status }),
          ...(interest === ALL ? {} : { interest_to_subscribe: interest }),
          ...(program === ALL ? {} : { beta_program_id: program }),
          page,
          pageSize: PAGE_SIZE,
        },
      }),
  });

  const programs = useQuery({
    queryKey: ["beta-programs", "for-participants"],
    queryFn: () => programsFn(),
    staleTime: 60_000,
  });

  const items = participantsQuery.data?.items ?? [];
  const total = participantsQuery.data?.total ?? 0;

  const openParticipant = (id: string) =>
    navigate({ to: "/os/produtos/valtro-pricing/beta/$id", params: { id } });

  const columns: DataTableColumn<BetaParticipant>[] = [
    {
      key: "code",
      header: "Código",
      render: (p) => (
        <Link
          to="/os/produtos/valtro-pricing/beta/$id"
          params={{ id: p.id }}
          onClick={(e) => e.stopPropagation()}
          className="whitespace-nowrap text-sm font-semibold text-primary hover:underline"
        >
          {p.code}
        </Link>
      ),
    },
    {
      key: "participant",
      header: "Participante",
      render: (p) => (
        <div className="min-w-0 max-w-[260px]">
          <p className="truncate font-medium text-foreground" title={p.name}>
            {p.name}
          </p>
          <p className="truncate text-xs text-muted-foreground" title={p.email}>
            {p.email}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Situação",
      render: (p) => <BetaParticipantStatusBadge status={p.status} />,
    },
    {
      key: "interest",
      header: "Interesse",
      render: (p) => <BetaParticipantInterestBadge interest={p.interest_to_subscribe} />,
    },
    {
      key: "program",
      header: "Programa",
      render: (p) => (
        <span className="text-sm text-muted-foreground">{p.program_name ?? "Não informado"}</span>
      ),
    },
    {
      key: "product",
      header: "Produto",
      render: (p) => (
        <span className="text-sm text-muted-foreground">{p.product_name ?? "Não informado"}</span>
      ),
    },
    {
      key: "updated",
      header: "Atualização",
      render: (p) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {fmtDateTime(p.updated_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Ações",
      className: "text-right",
      render: (p) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            openParticipant(p.id);
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
        title="Participantes do Beta"
        description="Gestão dos participantes do Beta Fechado do Valtro Pricing: convites, aceites, ativação, inativação e conversão em clientes."
        actions={
          canWrite ? (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Novo participante
            </Button>
          ) : undefined
        }
      />

      {!roleLoading && !canWrite && (
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <Eye className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Seu perfil é somente leitura: você pode consultar participantes, histórico e anexos, mas
            não pode cadastrar ou alterar registros.
          </p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por código, nome ou e-mail…"
            value={term}
            onChange={(e) => {
              setPage(1);
              setTerm(e.target.value);
            }}
          />
        </div>

        <Select
          value={status}
          onValueChange={withReset((v: string) =>
            setStatus(v as BetaParticipantStatus | typeof ALL),
          )}
        >
          <SelectTrigger>
            <SelectValue placeholder="Situação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as situações</SelectItem>
            {BETA_PARTICIPANT_STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {BETA_PARTICIPANT_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={interest}
          onValueChange={withReset((v: string) =>
            setInterest(v as BetaParticipantInterest | typeof ALL),
          )}
        >
          <SelectTrigger>
            <SelectValue placeholder="Interesse em assinar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os interesses</SelectItem>
            {BETA_PARTICIPANT_INTEREST_ORDER.map((i) => (
              <SelectItem key={i} value={i}>
                {BETA_PARTICIPANT_INTEREST_LABEL[i]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={program} onValueChange={withReset(setProgram)}>
          <SelectTrigger>
            <SelectValue placeholder="Programa beta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os programas</SelectItem>
            {programs.data?.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.code} — {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasFilters && (
        <div className="flex justify-start">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <SearchX className="mr-2 h-4 w-4" /> Limpar filtros
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={items}
        loading={participantsQuery.isLoading}
        onRowClick={(p) => openParticipant(p.id)}
        emptyState={
          <EmptyState
            icon={FlaskConical}
            title={
              hasFilters ? "Nenhum participante encontrado" : "Nenhum participante cadastrado"
            }
            description={
              hasFilters
                ? "Tente ajustar seus filtros para encontrar o que procura."
                : "Ainda não há participantes cadastrados no Beta Fechado."
            }
            action={
              hasFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              ) : canWrite ? (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Novo participante
                </Button>
              ) : undefined
            }
          />
        }
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Total de <strong>{total}</strong> participantes
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1 || participantsQuery.isLoading}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={items.length < PAGE_SIZE || participantsQuery.isLoading}
            onClick={() => setPage(page + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>

      <NewBetaParticipantDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
