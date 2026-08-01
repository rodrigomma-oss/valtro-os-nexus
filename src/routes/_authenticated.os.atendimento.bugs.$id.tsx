import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowLeft,
  Bug as BugIcon,
  History,
  Loader2,
  Save,
  Ticket as TicketIcon,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { TimelineCard, type TimelineItem } from "@/components/app/timeline-card";
import { AttachmentsCard } from "@/components/app/attachments-card";
import {
  BugEnvironmentBadge,
  BugSeverityBadge,
  BugStatusBadge,
} from "@/components/app/bug-badges";
import { MarkBugFixedDialog } from "@/components/app/mark-bug-fixed-dialog";
import {
  assignBug,
  changeBugStatus,
  closeBug,
  getBug,
  markBugFixed,
  reopenBug,
  updateBug,
} from "@/lib/os/bugs.functions";
import { listAssignableUsers } from "@/lib/leads.functions";
import { useCurrentRole } from "@/hooks/use-current-role";
import { setBreadcrumbLabel } from "@/lib/breadcrumb-store";
import type { BugAction } from "@/lib/os/bugs-ui";
import {
  BUG_CATEGORY_LABEL,
  BUG_CATEGORY_ORDER,
  BUG_ENVIRONMENT_LABEL,
  BUG_ENVIRONMENT_ORDER,
  BUG_SEVERITY_LABEL,
  BUG_SEVERITY_ORDER,
  BUG_STATUS_LABEL,
  bugActionsFor,
  bugEventTone,
  describeBugEvent,
  translateBugError,
} from "@/lib/os/bugs-ui";
import type { BugCategory, BugEnvironment, BugSeverity } from "@/types/bug";

export const Route = createFileRoute("/_authenticated/os/atendimento/bugs/$id")({
  component: BugDetail,
  head: () => ({
    meta: [
      { title: "Bug — Valtro OS" },
      {
        name: "description",
        content: "Ficha do bug com histórico imutável, responsável, versões e anexos de evidência.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const NONE = "__none__";

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <div className="text-sm text-foreground break-words">{value}</div>
    </div>
  );
}

function BugDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { canWrite } = useCurrentRole();

  const getFn = useServerFn(getBug);
  const updateFn = useServerFn(updateBug);
  const assignFn = useServerFn(assignBug);
  const statusFn = useServerFn(changeBugStatus);
  const fixFn = useServerFn(markBugFixed);
  const closeFn = useServerFn(closeBug);
  const reopenFn = useServerFn(reopenBug);
  const usersFn = useServerFn(listAssignableUsers);

  const queryKey = ["bug", id];
  const query = useQuery({ queryKey, queryFn: () => getFn({ data: { id } }) });
  const users = useQuery({
    queryKey: ["assignable-users"],
    queryFn: () => usersFn(),
    staleTime: 60_000,
    enabled: canWrite,
  });

  const bug = query.data?.bug;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [affectedVersion, setAffectedVersion] = useState("");
  const [requestIdValue, setRequestIdValue] = useState("");
  const [externalRef, setExternalRef] = useState("");
  const [fixOpen, setFixOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<BugAction | null>(null);

  useEffect(() => {
    if (!bug) return;
    setBreadcrumbLabel(bug.id, bug.code);
    setTitle(bug.title);
    setDescription(bug.description);
    setAffectedVersion(bug.affected_version ?? "");
    setRequestIdValue(bug.request_id ?? "");
    setExternalRef(bug.external_reference ?? "");
  }, [bug?.id, bug?.updated_at]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey });
    qc.invalidateQueries({ queryKey: ["bugs"] });
  };

  const fail = (label: string) => (err: Error) =>
    toast.error(label, { description: translateBugError(err.message) });

  const patchMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) => updateFn({ data: { id, ...patch } as never }),
    onSuccess: () => {
      toast.success("Bug atualizado.");
      invalidate();
    },
    onError: fail("Não foi possível atualizar o bug."),
  });

  const assignMutation = useMutation({
    mutationFn: (ownerId: string | null) => assignFn({ data: { id, owner_id: ownerId } }),
    onSuccess: () => {
      toast.success("Responsável atualizado.");
      invalidate();
    },
    onError: fail("Não foi possível atribuir o responsável."),
  });

  const statusMutation = useMutation({
    mutationFn: (action: BugAction) => {
      if (action.kind === "close") return closeFn({ data: { id } });
      if (action.kind === "reopen") return reopenFn({ data: { id } });
      return statusFn({ data: { id, status: action.to } });
    },
    onSuccess: () => {
      toast.success("Status atualizado.");
      invalidate();
    },
    onError: fail("Não foi possível alterar o status."),
  });

  const fixMutation = useMutation({
    mutationFn: (fixedVersion: string) => fixFn({ data: { id, fixed_version: fixedVersion } }),
    onSuccess: () => {
      toast.success("Bug marcado como corrigido.");
      setFixOpen(false);
      invalidate();
    },
    onError: fail("Não foi possível registrar a correção."),
  });

  if (query.isLoading) {
    return (
      <div className="p-6 md:p-10 space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (query.isError || !query.data || !bug) {
    const message = query.error instanceof Error ? query.error.message : null;
    return (
      <div className="p-6 md:p-10">
        <EmptyState
          icon={message?.includes("permiss") ? AlertTriangle : BugIcon}
          title="Bug não disponível"
          description={translateBugError(message)}
          action={
            <Button variant="outline" onClick={() => navigate({ to: "/os/atendimento/bugs" })}>
              Voltar para bugs
            </Button>
          }
        />
      </div>
    );
  }

  const { events } = query.data;
  const actions = canWrite ? bugActionsFor(bug.status) : [];

  const timelineItems: TimelineItem[] = [...events]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((e) => ({
      id: e.id,
      icon: History,
      title: describeBugEvent(e),
      description: `${e.created_by_name ?? "Sistema"} · ${fmtDateTime(e.created_at)}`,
      date: fmtDateTime(e.created_at),
      tone: bugEventTone(e.type),
    }));

  const runAction = (action: BugAction) => {
    if (action.kind === "fixed") {
      setFixOpen(true);
      return;
    }
    if (action.confirm) {
      setPendingAction(action);
      return;
    }
    statusMutation.mutate(action);
  };

  const dirty =
    title.trim() !== bug.title ||
    description.trim() !== bug.description ||
    affectedVersion.trim() !== (bug.affected_version ?? "") ||
    requestIdValue.trim() !== (bug.request_id ?? "") ||
    externalRef.trim() !== (bug.external_reference ?? "");

  return (
    <div className="p-6 md:p-10 space-y-6">
      <Link
        to="/os/atendimento/bugs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Bugs
      </Link>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="text-muted-foreground">{bug.code}</span>
            <span>{bug.title}</span>
          </span>
        }
        description={bug.description}
        actions={
          actions.length > 0 ? (
            <>
              {actions.map((action) => (
                <Button
                  key={`${action.kind}-${action.to}`}
                  variant={action.variant ?? "default"}
                  disabled={statusMutation.isPending || fixMutation.isPending}
                  onClick={() => runAction(action)}
                >
                  {statusMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {action.label}
                </Button>
              ))}
            </>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <BugStatusBadge status={bug.status} />
        <BugSeverityBadge severity={bug.severity} />
        <BugEnvironmentBadge environment={bug.environment} />
        {bug.status === "rejected" && (
          <span className="text-sm text-muted-foreground">
            Bug rejeitado — não há novas ações disponíveis.
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Informações</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <Field label="Código" value={bug.code} />
              <Field label="Produto" value={bug.product_name ?? "Não informado"} />
              <Field label="Status" value={BUG_STATUS_LABEL[bug.status]} />
              <Field label="Severidade" value={BUG_SEVERITY_LABEL[bug.severity]} />
              <Field label="Categoria" value={BUG_CATEGORY_LABEL[bug.category]} />
              <Field
                label="Ambiente"
                value={BUG_ENVIRONMENT_LABEL[bug.environment] ?? "Desconhecido"}
              />
              <Field label="Responsável" value={bug.owner_name ?? "Não atribuído"} />
              <Field label="Reportado por" value={bug.reported_by_name ?? "Não informado"} />
              <Field label="Versão afetada" value={bug.affected_version ?? "Não informada"} />
              <Field label="Versão corrigida" value={bug.fixed_version ?? "Não informada"} />
              <Field label="Request ID" value={bug.request_id ?? "Não informado"} />
              <Field label="Referência externa" value={bug.external_reference ?? "Não informada"} />
              <Field
                label="Chamado relacionado"
                value={
                  bug.ticket_id ? (
                    <Link
                      to="/os/atendimento/chamados/$id"
                      params={{ id: bug.ticket_id }}
                      className="inline-flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <TicketIcon className="h-3.5 w-3.5" /> Abrir chamado vinculado
                    </Link>
                  ) : (
                    "Sem chamado vinculado"
                  )
                }
              />
              <Field label="Criado em" value={fmtDateTime(bug.created_at)} />
              <Field
                label="Confirmado em"
                value={bug.confirmed_at ? fmtDateTime(bug.confirmed_at) : "Não confirmado"}
              />
              <Field
                label="Corrigido em"
                value={bug.fixed_at ? fmtDateTime(bug.fixed_at) : "Não corrigido"}
              />
              <Field
                label="Fechado em"
                value={bug.closed_at ? fmtDateTime(bug.closed_at) : "Em aberto"}
              />
              <Field label="Atualizado em" value={fmtDateTime(bug.updated_at)} />
            </CardContent>
          </Card>

          {canWrite && (
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-base">Gestão do bug</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Severidade</Label>
                    <Select
                      value={bug.severity}
                      onValueChange={(v) =>
                        patchMutation.mutate({ severity: v as BugSeverity })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BUG_SEVERITY_ORDER.map((s) => (
                          <SelectItem key={s} value={s}>
                            {BUG_SEVERITY_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Categoria</Label>
                    <Select
                      value={bug.category}
                      onValueChange={(v) =>
                        patchMutation.mutate({ category: v as BugCategory })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BUG_CATEGORY_ORDER.map((c) => (
                          <SelectItem key={c} value={c}>
                            {BUG_CATEGORY_LABEL[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Ambiente</Label>
                    <Select
                      value={bug.environment}
                      onValueChange={(v) =>
                        patchMutation.mutate({ environment: v as BugEnvironment })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BUG_ENVIRONMENT_ORDER.map((e) => (
                          <SelectItem key={e} value={e}>
                            {BUG_ENVIRONMENT_LABEL[e]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Responsável</Label>
                    <Select
                      value={bug.owner_id ?? NONE}
                      onValueChange={(v) => assignMutation.mutate(v === NONE ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Não atribuído" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Não atribuído</SelectItem>
                        {(users.data ?? []).map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.full_name ?? "Sem nome"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="bug-title">Título</Label>
                  <Input
                    id="bug-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="bug-description">Descrição</Label>
                  <Textarea
                    id="bug-description"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="bug-affected">Versão afetada</Label>
                    <Input
                      id="bug-affected"
                      value={affectedVersion}
                      onChange={(e) => setAffectedVersion(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bug-request">Request ID</Label>
                    <Input
                      id="bug-request"
                      value={requestIdValue}
                      onChange={(e) => setRequestIdValue(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bug-external">Referência externa</Label>
                    <Input
                      id="bug-external"
                      value={externalRef}
                      onChange={(e) => setExternalRef(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    disabled={!dirty || patchMutation.isPending}
                    onClick={() =>
                      patchMutation.mutate({
                        title: title.trim(),
                        description: description.trim(),
                        affected_version: affectedVersion.trim() || null,
                        request_id: requestIdValue.trim() || null,
                        external_reference: externalRef.trim() || null,
                      })
                    }
                  >
                    {patchMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Salvar alterações
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <AttachmentsCard entityType="bug" entityId={bug.id} canWrite={canWrite} />
        </div>

        <div className="space-y-6">
          {timelineItems.length > 0 ? (
            <TimelineCard title="Histórico" items={timelineItems} />
          ) : (
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-base">Histórico</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <EmptyState
                  icon={History}
                  title="Sem eventos"
                  description="As movimentações do bug aparecerão aqui automaticamente."
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <MarkBugFixedDialog
        open={fixOpen}
        onOpenChange={setFixOpen}
        submitting={fixMutation.isPending}
        defaultVersion={bug.fixed_version}
        onConfirm={(version) => fixMutation.mutate(version)}
      />

      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(v) => (v ? undefined : setPendingAction(null))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingAction?.label}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.kind === "reject"
                ? "Rejeitar é definitivo: o bug não poderá receber novas movimentações."
                : "O bug voltará para o fluxo de desenvolvimento e o histórico registrará a reabertura."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingAction) statusMutation.mutate(pendingAction);
                setPendingAction(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
