import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { 
  ArrowLeft, 
  MessageSquareHeart, 
  UserPlus, 
  ExternalLink, 
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  History,
  Paperclip,
  Check,
  X,
  RotateCcw,
  Pencil,
  Loader2,
  SearchX
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { TimelineCard } from "@/components/app/timeline-card";
import { AttachmentsCard } from "@/components/app/attachments-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  FeedbackStatusBadge,
  FeedbackTypeLabel,
  FeedbackSourceBadge,
  FeedbackValueLabel,
  FeedbackInterestLabel,
} from "@/components/app/feedback-badges";
import { 
  getFeedback, 
  updateFeedback, 
  assignFeedback, 
  changeFeedbackStatus, 
  closeFeedback, 
  reopenFeedback 
} from "@/lib/os/feedback.functions";
import { listSaasProducts } from "@/lib/saas-products.functions";
import { listAssignableUsers } from "@/lib/leads.functions";
import { listTickets } from "@/lib/tickets.functions";
import { listBugs } from "@/lib/os/bugs.functions";
import { useCurrentRole } from "@/hooks/use-current-role";
import type { 
  FeedbackType, 
  FeedbackPerceivedValue, 
  FeedbackSubscriptionInterest,
  FeedbackStatus
} from "@/types/feedback";
import {
  FEEDBACK_STATUS_LABEL,
  FEEDBACK_TYPE_LABEL,
  FEEDBACK_TYPE_ORDER,
  FEEDBACK_VALUE_LABEL,
  FEEDBACK_VALUE_ORDER,
  FEEDBACK_INTEREST_LABEL,
  FEEDBACK_INTEREST_ORDER,
  feedbackActionsFor,
  describeFeedbackEvent,
  feedbackEventTone,
  translateFeedbackError,
} from "@/lib/os/feedback-ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/os/atendimento/feedback/$id")({
  component: FeedbackDetail,
  head: () => ({
    meta: [
      { title: "Detalhes do Feedback — Valtro OS" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const NONE = "__none__";

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FeedbackDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { canWrite } = useCurrentRole();

  const getFn = useServerFn(getFeedback);
  const updateFn = useServerFn(updateFeedback);
  const assignFn = useServerFn(assignFeedback);
  const statusFn = useServerFn(changeFeedbackStatus);
  const closeFn = useServerFn(closeFeedback);
  const reopenFn = useServerFn(reopenFeedback);
  
  const productsFn = useServerFn(listSaasProducts);
  const usersFn = useServerFn(listAssignableUsers);
  const ticketsFn = useServerFn(listTickets);
  const bugsFn = useServerFn(listBugs);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const feedbackQuery = useQuery({
    queryKey: ["feedback", id],
    queryFn: () => {
      console.log(`[UI] Carregando feedback ID: ${id}`);
      return getFn({ data: { id } });
    },
    retry: 1,
    staleTime: 0,
  });

  const products = useQuery({
    queryKey: ["saas-products", "active"],
    queryFn: () => productsFn({ data: { activeOnly: true } }),
  });

  const users = useQuery({
    queryKey: ["assignable-users"],
    queryFn: () => usersFn(),
  });

  const tickets = useQuery({
    queryKey: ["tickets", "open"],
    queryFn: () => ticketsFn({ data: { status: "open", page: 1, pageSize: 50 } }),
  });

  const bugs = useQuery({
    queryKey: ["bugs", "active"],
    queryFn: () => bugsFn({ data: { page: 1, pageSize: 50 } }),
  });

  const { feedback, events } = feedbackQuery.data ?? {};

  const updateMutation = useMutation({
    mutationFn: updateFn,
    onSuccess: () => {
      toast.success("Feedback atualizado.");
      qc.invalidateQueries({ queryKey: ["feedback", id] });
      setIsEditing(false);
    },
    onError: (err: Error) => {
      toast.error(translateFeedbackError(err.message));
    },
  });

  const statusMutation = useMutation({
    mutationFn: statusFn,
    onSuccess: () => {
      toast.success("Status atualizado.");
      qc.invalidateQueries({ queryKey: ["feedback", id] });
    },
    onError: (err: Error) => {
      toast.error(translateFeedbackError(err.message));
    },
  });

  const assignMutation = useMutation({
    mutationFn: assignFn,
    onSuccess: () => {
      toast.success("Responsável atualizado.");
      qc.invalidateQueries({ queryKey: ["feedback", id] });
    },
    onError: (err: Error) => {
      toast.error(translateFeedbackError(err.message));
    },
  });

  if (feedbackQuery.isLoading) {
    return (
      <div className="flex min-h-[400px] w-full flex-col items-center justify-center gap-4 rounded-xl border bg-card p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Buscando detalhes do feedback...</p>
      </div>
    );
  }

  if (feedbackQuery.isError) {
    return (
      <div className="flex min-h-[400px] w-full flex-col items-center justify-center gap-4 rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-destructive">Falha na comunicação</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {translateFeedbackError(feedbackQuery.error.message)}
          </p>
        </div>
        <Button variant="outline" asChild className="mt-2">
          <Link to="/os/atendimento/feedback">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para listagem
          </Link>
        </Button>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="flex min-h-[400px] w-full flex-col items-center justify-center gap-4 rounded-xl border bg-muted/30 p-8 text-center">
        <SearchX className="h-10 w-10 text-muted-foreground" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Registro não encontrado</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            O feedback solicitado não existe ou você não tem permissão para visualizá-lo.
          </p>
        </div>
        <Button variant="outline" asChild className="mt-2">
          <Link to="/os/atendimento/feedback">
            <ArrowLeft className="mr-2 h-4 w-4" /> Ver todos os feedbacks
          </Link>
        </Button>
      </div>
    );
  }

  const handleStartEdit = () => {
    setEditTitle(feedback.title);
    setEditDescription(feedback.description);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    updateMutation.mutate({
      data: {
        id,
        title: editTitle,
        description: editDescription,
      },
    });
  };

  const handleStatusChange = (newStatus: FeedbackStatus) => {
    if (newStatus === "closed") {
      closeFn({ data: { id } }).then(() => {
        toast.success("Feedback encerrado.");
        qc.invalidateQueries({ queryKey: ["feedback", id] });
      }).catch(err => toast.error(translateFeedbackError(err.message)));
    } else {
      statusMutation.mutate({ data: { id, status: newStatus } });
    }
  };

  const handleReopen = () => {
    reopenFn({ data: { id } }).then(() => {
      toast.success("Feedback reaberto.");
      qc.invalidateQueries({ queryKey: ["feedback", id] });
    }).catch(err => toast.error(translateFeedbackError(err.message)));
  };

  const nextActions = feedbackActionsFor(feedback.status);

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/os/atendimento/feedback">
            <ArrowLeft className="mr-2 h-4 w-4" /> Feedback
          </Link>
        </Button>
      </div>

      <PageHeader
        title={feedback.code}
        description={feedback.title}
        actions={
          <div className="flex gap-2">
            {canWrite && feedback.status !== "closed" && feedback.status !== "dismissed" && (
              <>
                {!isEditing ? (
                  <Button variant="outline" onClick={handleStartEdit}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
                    <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                      Salvar alterações
                    </Button>
                  </>
                )}
              </>
            )}

            {canWrite && feedback.status === "closed" && (
              <Button variant="outline" onClick={handleReopen}>
                <RotateCcw className="mr-2 h-4 w-4" /> Reabrir
              </Button>
            )}

            {canWrite && nextActions.map((action) => (
              <Button
                key={action.to}
                variant={action.variant as any || "default"}
                onClick={() => handleStatusChange(action.to)}
                disabled={statusMutation.isPending}
              >
                {action.label}
              </Button>
            ))}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Informações do Feedback</CardTitle>
                <FeedbackStatusBadge status={feedback.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea 
                      value={editDescription} 
                      onChange={e => setEditDescription(e.target.value)}
                      className="min-h-[200px]"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Descrição</h4>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{feedback.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-1">Tipo</h4>
                      <FeedbackTypeLabel type={feedback.type} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-1">Origem</h4>
                      <FeedbackSourceBadge source={feedback.source} />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                Linha do Tempo
              </CardTitle>
              <CardDescription>Histórico completo de alterações e eventos do feedback.</CardDescription>
            </CardHeader>
            <CardContent>
              <TimelineCard 
                title="Histórico de Eventos"
                items={(events as any[])?.map(e => ({
                  id: e.id,
                  icon: History,
                  title: describeFeedbackEvent(e),
                  description: e.created_by_name ? `Realizado por ${e.created_by_name}` : "Sistema",
                  date: new Date(e.created_at).toLocaleString("pt-BR"),
                  tone: feedbackEventTone(e.event_type) as any
                })) || []} 
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Participante</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Nome</Label>
                <p className="text-sm font-medium">{feedback.participant_name || "Não informado"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">E-mail</Label>
                <p className="text-sm">{feedback.participant_email || "Não informado"}</p>
              </div>
              <div className="pt-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Análise de Valor</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Valor Percebido:</span>
                    <FeedbackValueLabel value={feedback.perceived_value} />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Interesse em Assinar:</span>
                    <FeedbackInterestLabel interest={feedback.subscription_interest} />
                  </div>
                </div>
              </div>
              {feedback.desired_feature && (
                <div className="pt-2">
                  <Label className="text-muted-foreground">Funcionalidade Desejada</Label>
                  <p className="text-sm italic">"{feedback.desired_feature}"</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Classificação e Gestão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Produto</Label>
                {canWrite ? (
                  <Select 
                    value={feedback.saas_product_id} 
                    onValueChange={(v) => updateMutation.mutate({ data: { id, saas_product_id: v } })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {products.data?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm">{feedback.product_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Responsável</Label>
                {canWrite ? (
                  <Select 
                    value={feedback.owner_id || NONE} 
                    onValueChange={(v) => assignMutation.mutate({ data: { id, owner_id: v === NONE ? null : v } })}

                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Não atribuído</SelectItem>
                      {users.data?.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm">{feedback.owner_name || "Não atribuído"}</p>
                )}
              </div>

              <div className="pt-2 space-y-3 border-t">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">Vínculos</h4>
                <div className="space-y-2">
                  <Label className="text-xs">Chamado</Label>
                  {feedback.ticket_id ? (
                    <Link 
                      to="/os/atendimento/chamados/$id" 
                      params={{ id: feedback.ticket_id }}
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> {feedback.tickets?.protocol}
                    </Link>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Nenhum chamado vinculado</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Bug</Label>
                  {feedback.bug_id ? (
                    <Link 
                      to="/os/atendimento/bugs/$id" 
                      params={{ id: feedback.bug_id }}
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> {feedback.bugs?.code}
                    </Link>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Nenhum bug vinculado</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <AttachmentsCard 
            entityType="feedback" 
            entityId={id} 
            canWrite={canWrite && feedback.status !== "closed" && feedback.status !== "dismissed"}
          />


          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Datas e Auditoria</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2 text-muted-foreground">
              <div className="flex justify-between">
                <span>Criado em:</span>
                <span className="text-foreground">{fmtDateTime(feedback.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span>Atualizado em:</span>
                <span className="text-foreground">{fmtDateTime(feedback.updated_at)}</span>
              </div>
              {feedback.reviewed_at && (
                <div className="flex justify-between">
                  <span>Revisado em:</span>
                  <span className="text-foreground">{fmtDateTime(feedback.reviewed_at)}</span>
                </div>
              )}
              {feedback.closed_at && (
                <div className="flex justify-between">
                  <span>Encerrado em:</span>
                  <span className="text-foreground">{fmtDateTime(feedback.closed_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
