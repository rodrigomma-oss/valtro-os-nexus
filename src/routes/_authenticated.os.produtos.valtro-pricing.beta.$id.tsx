import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  FlaskConical,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Check,
  X,
  RotateCcw,
  UserCheck,
  History,
  Clock,
  Bug,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { TimelineCard, type TimelineItem } from "@/components/app/timeline-card";
import { AttachmentsCard } from "@/components/app/attachments-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  getParticipant,
  updateParticipant,
  changeParticipantStatus,
  convertParticipant,
  reopenParticipant,
  registerInvitation,
  listParticipantInteractions,
} from "@/lib/os/beta-participants.functions";
import {
  BETA_PARTICIPANT_INTEREST_LABEL,
  BETA_PARTICIPANT_INTEREST_ORDER,
  BETA_PARTICIPANT_STATUS_LABEL,
  BETA_PARTICIPANT_TERMINAL_STATUS,
  betaParticipantActionsFor,
  describeBetaParticipantEvent,
  betaParticipantEventTone,
  translateBetaParticipantError,
} from "@/lib/os/beta-participants-ui";
import { useCurrentRole } from "@/hooks/use-current-role";
import type { BetaParticipantInterest } from "@/types/beta-participant";

export const Route = createFileRoute("/_authenticated/os/produtos/valtro-pricing/beta/$id")({
  component: BetaParticipantDetail,
  head: () => ({
    meta: [
      { title: "Detalhes do Participante do Beta — Valtro OS" },
      {
        name: "description",
        content:
          "Ficha completa do participante do Beta Fechado: situação, interesse, histórico e anexos.",
      },
      { property: "og:title", content: "Participante do Beta — Valtro OS" },
      {
        property: "og:description",
        content: "Ficha e histórico do participante do Beta Fechado do Valtro Pricing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const EVENT_ICONS = {
  created: Plus,
  invited: Mail,
  accepted: Check,
  activated: UserCheck,
  deactivated: Clock,
  removed: X,
  converted: UserCheck,
  interest_changed: Pencil,
  notes_changed: Pencil,
  linked_user: UserCheck,
  reopened: RotateCcw,
} as const;

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BetaParticipantDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { canWrite } = useCurrentRole();

  const getFn = useServerFn(getParticipant);
  const updateFn = useServerFn(updateParticipant);
  const statusFn = useServerFn(changeParticipantStatus);
  const convertFn = useServerFn(convertParticipant);
  const reopenFn = useServerFn(reopenParticipant);
  const inviteFn = useServerFn(registerInvitation);
  const interactionsFn = useServerFn(listParticipantInteractions);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const detail = useQuery({
    queryKey: ["beta-participants", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const participant = detail.data?.participant;
  const events = detail.data?.events ?? [];

  const interactions = useQuery({
    queryKey: ["beta-participant-interactions", participant?.email, participant?.saas_product_id],
    queryFn: () =>
      interactionsFn({
        data: {
          email: participant!.email,
          saas_product_id: participant!.saas_product_id,
          external_user_id: participant!.user_id,
        },
      }),
    enabled: !!participant,
  });

  useEffect(() => {
    if (participant && !isEditing) {
      setEditName(participant.name);
      setEditEmail(participant.email);
      setEditNotes(participant.notes ?? "");
    }
  }, [participant, isEditing]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["beta-participants"] });
  };

  const onError = (err: Error) =>
    toast.error("Não foi possível concluir a ação.", {
      description: translateBetaParticipantError(err.message),
    });

  const updateMutation = useMutation({
    mutationFn: updateFn,
    onSuccess: () => {
      toast.success("Participante atualizado.");
      setIsEditing(false);
      invalidate();
    },
    onError,
  });

  const statusMutation = useMutation({
    mutationFn: statusFn,
    onSuccess: () => {
      toast.success("Situação atualizada.");
      invalidate();
    },
    onError,
  });

  const convertMutation = useMutation({
    mutationFn: convertFn,
    onSuccess: () => {
      toast.success("Participante convertido em cliente.");
      invalidate();
    },
    onError,
  });

  const reopenMutation = useMutation({
    mutationFn: reopenFn,
    onSuccess: () => {
      toast.success("Participante reativado.");
      invalidate();
    },
    onError,
  });

  const inviteMutation = useMutation({
    mutationFn: inviteFn,
    onSuccess: () => {
      toast.success("Envio de convite registrado.");
      invalidate();
    },
    onError,
  });

  const busy =
    updateMutation.isPending ||
    statusMutation.isPending ||
    convertMutation.isPending ||
    reopenMutation.isPending ||
    inviteMutation.isPending;

  if (detail.isLoading) {
    return (
      <div className="flex items-center justify-center p-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (detail.isError || !participant) {
    return (
      <div className="p-6 md:p-10">
        <Card>
          <CardContent className="space-y-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {translateBetaParticipantError(
                detail.error instanceof Error ? detail.error.message : null,
              )}
            </p>
            <Button variant="outline" asChild>
              <Link to="/os/produtos/valtro-pricing/beta">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para participantes
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isTerminal = BETA_PARTICIPANT_TERMINAL_STATUS.includes(participant.status);
  const actions = betaParticipantActionsFor(participant);

  const timelineItems: TimelineItem[] = events.map((e) => ({
    id: e.id,
    icon: EVENT_ICONS[e.type] ?? History,
    title: describeBetaParticipantEvent(e),
    description: e.created_by_name ? `Por ${e.created_by_name}` : "Registro automático do sistema",
    date: fmtDateTime(e.created_at),
    tone: betaParticipantEventTone(e.type),
  }));

  const runAction = (kind: string, to: string) => {
    if (kind === "convert") convertMutation.mutate({ data: { id } });
    else if (kind === "reopen") reopenMutation.mutate({ data: { id } });
    else if (kind === "invite") inviteMutation.mutate({ data: { id } });
    else statusMutation.mutate({ data: { id, status: to as any } });
  };

  return (
    <div className="space-y-6 p-6 md:p-10">
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onClick={() => navigate({ to: "/os/produtos/valtro-pricing/beta" })}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Participantes do Beta
      </Button>

      <PageHeader
        title={`${participant.code} — ${participant.name}`}
        description={`${participant.email} · ${participant.program_name ?? "Programa não informado"}`}
        actions={
          canWrite && !isTerminal ? (
            <div className="flex flex-wrap gap-2">
              {actions.map((a) => (
                <Button
                  key={`${a.kind}-${a.to}`}
                  variant={a.variant ?? "outline"}
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    if (a.confirm && !window.confirm(`Confirmar: ${a.label}?`)) return;
                    runAction(a.kind, a.to);
                  }}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Dados do participante</CardTitle>
              {canWrite && !isTerminal && !isEditing && (
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                  <Pencil className="mr-2 h-4 w-4" /> Editar
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-name">Nome</Label>
                    <Input
                      id="edit-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-email">E-mail</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-notes">Observações internas</Label>
                    <Textarea
                      id="edit-notes"
                      rows={4}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        updateMutation.mutate({
                          data: {
                            id,
                            name: editName.trim(),
                            email: editEmail.trim().toLowerCase(),
                            notes: editNotes.trim() ? editNotes.trim() : null,
                          },
                        })
                      }
                    >
                      Salvar alterações
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                      Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      Situação
                    </dt>
                    <dd className="mt-1">
                      <BetaParticipantStatusBadge status={participant.status} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      Interesse em assinar
                    </dt>
                    <dd className="mt-1 flex items-center gap-2">
                      <BetaParticipantInterestBadge interest={participant.interest_to_subscribe} />
                      {canWrite && !isTerminal && (
                        <Select
                          value={participant.interest_to_subscribe}
                          onValueChange={(v) =>
                            updateMutation.mutate({
                              data: { id, interest_to_subscribe: v as BetaParticipantInterest },
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-[160px]">
                            <SelectValue placeholder="Alterar" />
                          </SelectTrigger>
                          <SelectContent>
                            {BETA_PARTICIPANT_INTEREST_ORDER.map((i) => (
                              <SelectItem key={i} value={i}>
                                {BETA_PARTICIPANT_INTEREST_LABEL[i]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      Programa beta
                    </dt>
                    <dd className="mt-1 text-sm text-foreground">
                      {participant.program_code
                        ? `${participant.program_code} — ${participant.program_name}`
                        : "Não informado"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      Produto
                    </dt>
                    <dd className="mt-1 text-sm text-foreground">
                      {participant.product_name ?? "Não informado"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      Observações internas
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {participant.notes ?? "Nenhuma observação registrada."}
                    </dd>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>

          <TimelineCard title="Histórico do participante" items={timelineItems} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                Interações do Beta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Bug className="h-4 w-4 text-destructive" />
                  Bugs
                </h4>
                {interactions.isLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Carregando bugs...
                  </div>
                ) : interactions.data?.bugs.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhum Bug registrado para este participante.</p>
                ) : (
                  <div className="grid gap-2">
                    {interactions.data?.bugs.map((b) => (
                      <div key={b.id} className="group flex items-center justify-between rounded-lg border border-border p-2 hover:bg-muted/50 transition-colors">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold bg-muted px-1.5 py-0.5 rounded uppercase tracking-tighter">
                              {b.code}
                            </span>
                            <p className="text-xs font-medium truncate" title={b.title}>{b.title}</p>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>{fmtDateTime(b.created_at)}</span>
                            <span>•</span>
                            <span className="capitalize">{b.status}</span>
                            <span>•</span>
                            <span className="capitalize">{b.severity}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                          <Link to="/os/atendimento/bugs/$id" params={{ id: b.id }}>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Feedback
                </h4>
                {interactions.isLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Carregando feedback...
                  </div>
                ) : interactions.data?.feedback.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhum Feedback registrado para este participante.</p>
                ) : (
                  <div className="grid gap-2">
                    {interactions.data?.feedback.map((f) => (
                      <div key={f.id} className="group flex items-center justify-between rounded-lg border border-border p-2 hover:bg-muted/50 transition-colors">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold bg-muted px-1.5 py-0.5 rounded uppercase tracking-tighter">
                              {f.code}
                            </span>
                            <p className="text-xs font-medium truncate" title={f.title}>{f.title}</p>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>{fmtDateTime(f.created_at)}</span>
                            <span>•</span>
                            <span className="capitalize">{f.status}</span>
                            <span>•</span>
                            <span className="capitalize">{f.type}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                          <Link to="/os/atendimento/feedback/$id" params={{ id: f.id }}>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <AttachmentsCard
            entityType="beta_participant"
            entityId={id}
            canWrite={canWrite && !isTerminal}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Datas e auditoria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between gap-4">
                <span>Cadastro</span>
                <span>{fmtDateTime(participant.created_at)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Convite</span>
                <span>
                  {participant.invited_at ? fmtDateTime(participant.invited_at) : "Não registrado"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Aceite</span>
                <span>
                  {participant.accepted_at ? fmtDateTime(participant.accepted_at) : "Pendente"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Ativação</span>
                <span>
                  {participant.activated_at ? fmtDateTime(participant.activated_at) : "Pendente"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Encerramento</span>
                <span>{participant.ended_at ? fmtDateTime(participant.ended_at) : "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Conversão</span>
                <span>
                  {participant.converted_at ? fmtDateTime(participant.converted_at) : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Convidado por</span>
                <span>{participant.invited_by_name ?? "Não informado"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Última atualização</span>
                <span>{fmtDateTime(participant.updated_at)}</span>
              </div>
            </CardContent>
          </Card>

          {isTerminal && (
            <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              Participante em situação final ({BETA_PARTICIPANT_STATUS_LABEL[participant.status]}).
              Nenhuma nova alteração é permitida.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
