import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ClipboardList,
  Target,
  Tag,
  UserCog,
  Lightbulb,
  Loader2,
  CheckCircle2,
  XCircle,
  PlayCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  startTriage,
  updateTriage,
  discardLead,
  convertLead,
  listAssignableUsers,
} from "@/lib/leads.functions";
import {
  INTEREST_LABEL,
  NEXT_ACTION_LABEL,
  SOURCE_LABEL,
  type Lead,
  type LeadServiceType,
  type NextAction,
} from "@/types/lead";

interface TriageCardProps {
  lead: Lead;
  canWrite: boolean;
  onChanged: () => void;
}

const INTEREST_OPTIONS: LeadServiceType[] = [
  "desenvolvimento_projeto",
  "diagnostico",
  "trafego_pago",
  "consultoria",
  "gestao_shopee",
  "gestao_mercadolivre",
  "gestao_amazon",
  "gestao_multicanal",
  "outro",
  "nao_definido",
];

const NEXT_ACTION_OPTIONS: NextAction[] = [
  "entrar_em_contato",
  "enviar_briefing_projeto",
  "enviar_briefing_loja",
  "apresentar_pricing",
  "avaliar_parceria",
  "preparar_proposta",
  "aguardar_retorno",
  "descartar",
];

function recommendedFor(interest: LeadServiceType): {
  label: string;
  hint: string;
} | null {
  switch (interest) {
    case "desenvolvimento_projeto":
      return {
        label: "Enviar briefing de projeto",
        hint: "O interesse indica escopo de desenvolvimento.",
      };
    case "diagnostico":
      return {
        label: "Enviar briefing de loja",
        hint: "Análise de loja tem template dedicado.",
      };
    case "trafego_pago":
      return {
        label: "Apresentar Valtro Pricing",
        hint: "Contato comercial ou apresentação do produto.",
      };
    case "outro":
      return {
        label: "Avaliar manualmente",
        hint: "Interesse não mapeado — triagem manual recomendada.",
      };
    default:
      return null;
  }
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TriageCard({ lead, canWrite, onChanged }: TriageCardProps) {
  const qc = useQueryClient();
  const startFn = useServerFn(startTriage);
  const updateFn = useServerFn(updateTriage);
  const discardFn = useServerFn(discardLead);
  const convertFn = useServerFn(convertLead);
  const listUsersFn = useServerFn(listAssignableUsers);

  const usersQuery = useQuery({
    queryKey: ["assignable-users"],
    queryFn: () => listUsersFn(),
    staleTime: 60_000,
    enabled: canWrite,
  });

  const [notesDraft, setNotesDraft] = useState<string>(lead.triage_notes ?? "");
  const [notesDirty, setNotesDirty] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["lead", lead.id] });
    qc.invalidateQueries({ queryKey: ["leads"] });
    onChanged();
  };

  const startMut = useMutation({
    mutationFn: () => startFn({ data: { id: lead.id } }),
    onSuccess: () => {
      toast.success("Triagem iniciada.");
      invalidate();
    },
    onError: (e: Error) =>
      toast.error("Não foi possível iniciar a triagem.", { description: e.message }),
  });

  const updateMut = useMutation({
    mutationFn: (patch: Parameters<typeof updateFn>[0]["data"]) =>
      updateFn({ data: patch }),
    onSuccess: () => {
      toast.success("Triagem atualizada.");
      setNotesDirty(false);
      invalidate();
    },
    onError: (e: Error) =>
      toast.error("Não foi possível atualizar.", { description: e.message }),
  });

  const discardMut = useMutation({
    mutationFn: () => discardFn({ data: { id: lead.id } }),
    onSuccess: () => {
      toast.success("Oportunidade descartada.");
      invalidate();
    },
    onError: (e: Error) =>
      toast.error("Não foi possível descartar.", { description: e.message }),
  });

  const convertMut = useMutation({
    mutationFn: () => convertFn({ data: { id: lead.id } }),
    onSuccess: () => {
      toast.success("Oportunidade convertida.");
      invalidate();
    },
    onError: (e: Error) =>
      toast.error("Não foi possível converter.", { description: e.message }),
  });

  const recommendation = useMemo(
    () => recommendedFor(lead.service_type),
    [lead.service_type],
  );

  const triageStarted = !!lead.triage_started_at;
  const canConvert = ["proposta", "em_analise", "briefing_enviado"].includes(lead.status);
  const canDiscard = !["ganho", "descartado"].includes(lead.status);

  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" strokeWidth={1.75} />
            Triagem comercial
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Valide o Lead e defina o próximo passo antes de gerar qualquer briefing.
          </p>
        </div>
        <StatusBadge status={lead.status} />
      </CardHeader>
      <CardContent className="pt-0 space-y-5">
        {/* Meta grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <MetaRow label="Origem" value={SOURCE_LABEL[lead.source]} />
          <MetaRow label="Data de entrada" value={formatDate(lead.created_at)} />
          <MetaRow label="Triagem iniciada" value={formatDate(lead.triage_started_at)} />
          <MetaRow
            label="Responsável"
            value={lead.owner_name ?? <span className="text-muted-foreground">Sem responsável</span>}
          />
        </div>

        {/* Recomendação */}
        {recommendation && (
          <div className="flex items-start gap-2.5 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2.5 text-xs">
            <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" strokeWidth={1.75} />
            <div>
              <p className="font-medium text-foreground">
                Recomendação: {recommendation.label}
              </p>
              <p className="text-muted-foreground mt-0.5">{recommendation.hint}</p>
            </div>
          </div>
        )}

        {/* Interesse (service_type) */}
        <FieldRow
          icon={Tag}
          label="Tipo de interesse"
          control={
            <Select
              value={lead.service_type}
              onValueChange={(v) =>
                updateMut.mutate({ id: lead.id, service_type: v as LeadServiceType })
              }
              disabled={!canWrite || updateMut.isPending}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTEREST_OPTIONS.map((v) => (
                  <SelectItem key={v} value={v}>
                    {INTEREST_LABEL[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        {/* Próxima ação */}
        <FieldRow
          icon={Target}
          label="Próxima ação"
          control={
            <Select
              value={lead.next_action ?? "__none"}
              onValueChange={(v) =>
                updateMut.mutate({
                  id: lead.id,
                  next_action: v === "__none" ? null : (v as NextAction),
                })
              }
              disabled={!canWrite || updateMut.isPending}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecionar próxima ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Não definida</SelectItem>
                {NEXT_ACTION_OPTIONS.map((v) => (
                  <SelectItem key={v} value={v}>
                    {NEXT_ACTION_LABEL[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        {/* Responsável */}
        <FieldRow
          icon={UserCog}
          label="Responsável"
          control={
            <Select
              value={lead.owner_id ?? "__none"}
              onValueChange={(v) =>
                updateMut.mutate({
                  id: lead.id,
                  owner_id: v === "__none" ? null : v,
                })
              }
              disabled={!canWrite || updateMut.isPending || usersQuery.isLoading}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Sem responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Sem responsável</SelectItem>
                {(usersQuery.data ?? []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name ?? "Sem nome"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        {/* Observações de triagem */}
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Observações de triagem
          </label>
          <Textarea
            rows={3}
            value={notesDraft}
            placeholder="Contexto interno para o time comercial (não vai para o cliente)."
            onChange={(e) => {
              setNotesDraft(e.target.value);
              setNotesDirty(e.target.value !== (lead.triage_notes ?? ""));
            }}
            disabled={!canWrite}
          />
          {notesDirty && (
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNotesDraft(lead.triage_notes ?? "");
                  setNotesDirty(false);
                }}
              >
                Descartar
              </Button>
              <Button
                size="sm"
                disabled={updateMut.isPending}
                onClick={() =>
                  updateMut.mutate({
                    id: lead.id,
                    triage_notes: notesDraft.trim() || null,
                  })
                }
              >
                Salvar observações
              </Button>
            </div>
          )}
        </div>

        {/* Ações rápidas */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border pt-4">
          {!triageStarted && canWrite && (
            <Button
              size="sm"
              className="gap-2"
              disabled={startMut.isPending}
              onClick={() => startMut.mutate()}
            >
              {startMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" strokeWidth={1.75} />
              )}
              Iniciar triagem
            </Button>
          )}
          {canWrite && canConvert && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              disabled={convertMut.isPending}
              onClick={() => {
                if (confirm("Marcar esta oportunidade como convertida?")) convertMut.mutate();
              }}
            >
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
              Converter
            </Button>
          )}
          {canWrite && canDiscard && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 text-destructive"
              disabled={discardMut.isPending}
              onClick={() => {
                if (confirm("Descartar esta oportunidade? Essa ação registra evento na timeline.")) {
                  discardMut.mutate();
                }
              }}
            >
              <XCircle className="h-4 w-4" strokeWidth={1.75} />
              Descartar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function FieldRow({
  icon: Icon,
  label,
  control,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  control: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
        {label}
      </label>
      {control}
    </div>
  );
}
