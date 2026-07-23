import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Sparkles,
  MessageCircle,
  FileText,
  Send,
  Archive,
  Loader2,
  Trash2,
  Pencil,
  RefreshCcw,
  Ban,
  PlayCircle,
  RotateCcw,
  CheckCircle2,
  ClipboardList,
  Target,
  Tag,
  UserCog,
  Trophy,
  XCircle,
  Phone,
  CalendarClock,
  CalendarCheck,
  Receipt,
  CheckSquare,
  XSquare,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { LeadInfoCard } from "@/components/app/lead-info-card";
import { ActionCard } from "@/components/app/action-card";
import { TriageCard } from "@/components/app/triage-card";
import { BriefingsCard } from "@/components/app/briefings-card";
import { ProposalsCard } from "@/components/app/proposals-card";
import { TimelineCard, type TimelineItem } from "@/components/app/timeline-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/app/status-badge";
import {
  addLeadNote,
  deleteLeadNote,
  getLead,
  updateLead,
  archiveLead,
  getMyRoles,
} from "@/lib/leads.functions";
import { listLeadBriefingTokens } from "@/lib/briefing.functions";
import { FollowUpCard } from "@/components/app/follow-up-card";
import { ContactHistoryCard } from "@/components/app/contact-history-card";
import { MessageComposerDialog } from "@/components/app/message-composer-dialog";
import type { LeadEvent, LeadEventType, LeadNote, LeadStatus } from "@/types/lead";
import { STATUS_LABEL } from "@/types/lead";

export const Route = createFileRoute("/_authenticated/crm/leads/$id")({
  component: CrmLeadDetail,
  head: () => ({
    meta: [
      { title: "Lead — CRM Valtro Labs" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const STATUS_ORDER: LeadStatus[] = [
  "novo",
  "em_triagem",
  "contato",
  "qualificado",
  "aguardando_briefing",
  "briefing_enviado",
  "em_analise",
  "proposta",
  "ganho",
  "perdido",
  "descartado",
];

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = STATUS_ORDER.map(
  (value) => ({ value, label: STATUS_LABEL[value] }),
);

const EVENT_META: Record<
  LeadEventType,
  { icon: typeof Sparkles; tone: TimelineItem["tone"]; title: string }
> = {
  lead_criado: { icon: Sparkles, tone: "default", title: "Lead criado" },
  status_alterado: { icon: RefreshCcw, tone: "warning", title: "Status alterado" },
  observacao_adicionada: {
    icon: MessageCircle,
    tone: "default",
    title: "Observação adicionada",
  },
  observacao_editada: {
    icon: Pencil,
    tone: "default",
    title: "Observação editada",
  },
  observacao_removida: {
    icon: Trash2,
    tone: "muted",
    title: "Observação removida",
  },
  briefing_enviado: { icon: Send, tone: "success", title: "Briefing enviado" },
  briefing_recebido: {
    icon: FileText,
    tone: "success",
    title: "Briefing recebido",
  },
  briefing_gerado: { icon: FileText, tone: "success", title: "Briefing gerado" },
  briefing_revogado: { icon: Ban, tone: "muted", title: "Briefing revogado" },
  briefing_reenviado: {
    icon: RefreshCcw,
    tone: "default",
    title: "Briefing reenviado",
  },
  briefing_iniciado: { icon: PlayCircle, tone: "default", title: "Cliente iniciou o Briefing" },
  briefing_retomado: { icon: RotateCcw, tone: "default", title: "Cliente retomou o Briefing" },
  briefing_concluido: { icon: CheckCircle2, tone: "success", title: "Briefing concluído" },
  lead_arquivado: { icon: Archive, tone: "muted", title: "Lead arquivado" },
  lead_atualizado: { icon: Pencil, tone: "default", title: "Lead atualizado" },
  triagem_iniciada: { icon: ClipboardList, tone: "default", title: "Triagem iniciada" },
  proxima_acao_alterada: { icon: Target, tone: "default", title: "Próxima ação alterada" },
  interesse_alterado: { icon: Tag, tone: "default", title: "Interesse alterado" },
  responsavel_alterado: { icon: UserCog, tone: "default", title: "Responsável alterado" },
  oportunidade_convertida: { icon: Trophy, tone: "success", title: "Oportunidade convertida" },
  oportunidade_descartada: { icon: XCircle, tone: "muted", title: "Oportunidade descartada" },
  contato_registrado: { icon: Phone, tone: "default", title: "Contato registrado" },
  follow_up_agendado: { icon: CalendarClock, tone: "default", title: "Follow-up agendado" },
  follow_up_concluido: { icon: CalendarCheck, tone: "success", title: "Follow-up concluído" },
  proposta_criada: { icon: Receipt, tone: "default", title: "Proposta criada" },
  proposta_status_alterado: { icon: RefreshCw, tone: "default", title: "Proposta — status alterado" },
  proposta_aprovada: { icon: CheckSquare, tone: "success", title: "Proposta aprovada" },
  proposta_rejeitada: { icon: XSquare, tone: "muted", title: "Proposta rejeitada" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CrmLeadDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const getLeadFn = useServerFn(getLead);
  const addNoteFn = useServerFn(addLeadNote);
  const deleteNoteFn = useServerFn(deleteLeadNote);
  const updateLeadFn = useServerFn(updateLead);
  const archiveLeadFn = useServerFn(archiveLead);
  const getMyRolesFn = useServerFn(getMyRoles);
  const listBriefingsFn = useServerFn(listLeadBriefingTokens);

  const leadQuery = useQuery({
    queryKey: ["lead", id],
    queryFn: () => getLeadFn({ data: { id } }),
  });
  const rolesQuery = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => getMyRolesFn(),
    staleTime: 60_000,
  });
  const briefingsQuery = useQuery({
    queryKey: ["briefing", "tokens", id],
    queryFn: () => listBriefingsFn({ data: { lead_id: id } }),
  });

  const [note, setNote] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);

  const canWrite = rolesQuery.data?.canWrite ?? false;

  const activeBriefing = (briefingsQuery.data ?? []).find(
    (t) => t.status === "ativo" || t.status === "pendente",
  );
  const briefingLink =
    activeBriefing && typeof window !== "undefined"
      ? `${window.location.origin}/briefing/${activeBriefing.id}`
      : null;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["lead", id] });
    qc.invalidateQueries({ queryKey: ["leads"] });
    qc.invalidateQueries({ queryKey: ["leads-kpis"] });
  };

  const addNoteMutation = useMutation({
    mutationFn: () => addNoteFn({ data: { lead_id: id, content: note } }),
    onSuccess: () => {
      toast.success("Observação adicionada.");
      setNote("");
      invalidate();
    },
    onError: (err: Error) =>
      toast.error("Não foi possível salvar.", { description: err.message }),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) =>
      deleteNoteFn({ data: { id: noteId, lead_id: id } }),
    onSuccess: () => {
      toast.success("Observação removida.");
      invalidate();
    },
    onError: (err: Error) =>
      toast.error("Não foi possível remover.", { description: err.message }),
  });

  const statusMutation = useMutation({
    mutationFn: (status: LeadStatus) =>
      updateLeadFn({ data: { id, status } }),
    onSuccess: () => {
      toast.success("Status atualizado.");
      invalidate();
    },
    onError: (err: Error) =>
      toast.error("Não foi possível atualizar o status.", {
        description: err.message,
      }),
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveLeadFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Lead arquivado.");
      invalidate();
    },
    onError: (err: Error) =>
      toast.error("Não foi possível arquivar.", { description: err.message }),
  });

  if (leadQuery.isLoading) {
    return (
      <div className="p-10 flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando lead...
      </div>
    );
  }

  if (leadQuery.isError) {
    return (
      <div className="p-6 md:p-10">
        <PageHeader
          title="Erro ao carregar lead"
          description={
            leadQuery.error instanceof Error
              ? leadQuery.error.message
              : "Tente novamente em instantes."
          }
          actions={
            <Button variant="outline" onClick={() => leadQuery.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      </div>
    );
  }

  const payload = leadQuery.data;
  if (!payload) throw notFound();

  const { lead, events, notes } = payload;

  const timeline: TimelineItem[] = buildTimeline(events, notes);

  return (
    <div className="p-6 md:p-10 space-y-6">
      <PageHeader
        title={lead.company_name}
        description={`Detalhamento do lead — ${lead.contact_name}${
          lead.city ? " · " + lead.city : ""
        }`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/crm/leads">
                <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.75} />
                Voltar
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Status
              </span>
              <Select
                value={lead.status}
                onValueChange={(v) => statusMutation.mutate(v as LeadStatus)}
                disabled={!canWrite || statusMutation.isPending}
              >
                <SelectTrigger className="w-[170px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <StatusBadge status={o.value} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setComposerOpen(true)}
            >
              <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
              Comunicação
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive"
              disabled={!canWrite || !!lead.archived_at || archiveMutation.isPending}
              onClick={() => {
                if (confirm("Arquivar este lead?")) archiveMutation.mutate();
              }}
            >
              <Archive className="h-4 w-4" strokeWidth={1.75} />
              {lead.archived_at ? "Arquivado" : "Arquivar"}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <LeadInfoCard lead={lead} />
          <FollowUpCard lead={lead} canWrite={canWrite} onChanged={invalidate} />
        </div>


        <div className="lg:col-span-2 space-y-6">
          <TriageCard lead={lead} canWrite={canWrite} onChanged={invalidate} />

          <ActionCard
            title="Observações"
            description="Anotações internas do time comercial sobre o lead."
          >
            {canWrite && (
              <div className="space-y-3 mb-4">
                <Textarea
                  placeholder="Escreva uma observação sobre este lead..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={
                      !note.trim() || addNoteMutation.isPending
                    }
                    onClick={() => addNoteMutation.mutate()}
                  >
                    {addNoteMutation.isPending
                      ? "Salvando..."
                      : "Adicionar observação"}
                  </Button>
                </div>
              </div>
            )}

            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Nenhuma observação registrada ainda.
              </p>
            ) : (
              <ul className="space-y-3">
                {notes.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-lg bg-muted/40 p-4 text-sm text-foreground"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2 text-xs text-muted-foreground">
                      <span>
                        <span className="font-medium text-foreground">
                          {n.created_by_name ?? "Você"}
                        </span>{" "}
                        · {formatDate(n.created_at)}
                      </span>
                      {canWrite && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (confirm("Remover esta observação?")) {
                              deleteNoteMutation.mutate(n.id);
                            }
                          }}
                          disabled={deleteNoteMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {n.content}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </ActionCard>

          <BriefingsCard lead={lead} canWrite={canWrite} />

          <ProposalsCard
            lead={lead}
            canWrite={canWrite}
            isAdmin={rolesQuery.data?.isAdmin ?? false}
          />


          <ContactHistoryCard leadId={lead.id} canWrite={canWrite} />

          <TimelineCard title="Linha do tempo" items={timeline} />
        </div>
      </div>

      <MessageComposerDialog
        open={composerOpen}
        onOpenChange={setComposerOpen}
        lead={lead}
        briefingLink={briefingLink}
        canWrite={canWrite}
        onContactCreated={invalidate}
      />
    </div>
  );
}

function buildTimeline(events: LeadEvent[], _notes: LeadNote[]): TimelineItem[] {
  return events.map((e) => {
    const meta = EVENT_META[e.type];
    const author = e.created_by_name ? ` · ${e.created_by_name}` : "";
    return {
      id: e.id,
      icon: meta.icon,
      title: meta.title,
      description: (e.description ?? "") + author,
      date: formatDate(e.created_at),
      tone: meta.tone,
    };
  });
}
