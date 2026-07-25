/**
 * OnboardingCard — Sprint 13.5.
 *
 * UI interna do onboarding DENTRO da contratação: status, template,
 * responsável, prazo, datas, geração/cópia do link, revogação e
 * visualização das respostas.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Ban,
  ClipboardCheck,
  Copy,
  Eye,
  Loader2,
  PackagePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getOnboardingContext,
  getOnboardingResponseForOperator,
  listOnboardings,
  revokeOnboarding,
  startOnboarding,
} from "@/lib/onboarding.functions";
import {
  ONBOARDING_STATUS_LABEL,
  ONBOARDING_STATUS_TONE,
  type ClientServiceOnboarding,
} from "@/types/onboarding";
import {
  formatOnboardingAnswer as formatAnswer,
  getOnboardingTemplate,
} from "@/config/onboarding-templates";

interface OnboardingCardProps {
  clientServiceId: string;
  canWrite: boolean;
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OnboardingCard({ clientServiceId, canWrite }: OnboardingCardProps) {
  const qc = useQueryClient();
  const contextFn = useServerFn(getOnboardingContext);
  const listFn = useServerFn(listOnboardings);
  const startFn = useServerFn(startOnboarding);

  const contextQuery = useQuery({
    queryKey: ["onboarding-context", clientServiceId],
    queryFn: () => contextFn({ data: { client_service_id: clientServiceId } }),
    staleTime: 30_000,
  });
  const listQuery = useQuery({
    queryKey: ["onboardings", clientServiceId],
    queryFn: () => listFn({ data: { client_service_id: clientServiceId } }),
    staleTime: 30_000,
  });


  const startMutation = useMutation({
    mutationFn: () => startFn({ data: { client_service_id: clientServiceId } }),
    onSuccess: () => {
      toast.success("Onboarding aberto. Copie o link e envie ao cliente.");
      qc.invalidateQueries({ queryKey: ["onboardings", clientServiceId] });
      qc.invalidateQueries({ queryKey: ["onboarding-context", clientServiceId] });
      qc.invalidateQueries({ queryKey: ["client-service-events", clientServiceId] });
    },
    onError: (err: Error) =>
      toast.error(err.message || "Não foi possível abrir o onboarding."),
  });

  const ctx = contextQuery.data;
  const onboardings = listQuery.data ?? [];
  const hasTemplate = !!ctx?.template_key;

  return (
    <div
      className="mt-3 rounded-lg border border-border bg-muted/20 p-3"
      data-testid="onboarding-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Onboarding
        </span>
        {ctx?.template_key && (
          <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            {getOnboardingTemplate(ctx.template_key)?.name ?? ctx.template_key}
          </span>
        )}
        {canWrite && (
          <Button
            size="sm"
            className="ml-auto"
            data-testid="onboarding-start-action"
            disabled={!ctx?.can_start || startMutation.isPending}
            onClick={() => startMutation.mutate()}
          >
            {startMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <PackagePlus className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.75} />
            )}
            Iniciar onboarding
          </Button>
        )}
      </div>

      {!hasTemplate && (
        <p className="mt-2 text-xs text-muted-foreground" data-testid="onboarding-no-template">
          Este serviço não exige onboarding.
        </p>
      )}
      {hasTemplate && ctx?.blocked_reason && (
        <p className="mt-2 text-xs text-muted-foreground">{ctx.blocked_reason}</p>
      )}

      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando onboarding…
        </div>
      ) : onboardings.length === 0 ? (
        hasTemplate && (
          <p className="mt-2 text-xs text-muted-foreground">
            Nenhum onboarding aberto para esta contratação.
          </p>
        )
      ) : (
        <ul className="mt-3 space-y-2">
          {onboardings.map((o) => (
            <OnboardingRow
              key={o.id}
              onboarding={o}
              clientServiceId={clientServiceId}
              canWrite={canWrite}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function OnboardingRow({
  onboarding: o,
  clientServiceId,
  canWrite,
}: {
  onboarding: ClientServiceOnboarding;
  clientServiceId: string;
  canWrite: boolean;
}) {
  const qc = useQueryClient();
  const revokeFn = useServerFn(revokeOnboarding);
  const [showAnswers, setShowAnswers] = useState(false);

  const revokeMutation = useMutation({
    mutationFn: () => revokeFn({ data: { onboarding_id: o.id } }),
    onSuccess: () => {
      toast.success("Onboarding revogado.");
      qc.invalidateQueries({ queryKey: ["onboardings", clientServiceId] });
      qc.invalidateQueries({ queryKey: ["onboarding-context", clientServiceId] });
      qc.invalidateQueries({ queryKey: ["client-service-events", clientServiceId] });
    },
    onError: (err: Error) => toast.error(err.message || "Não foi possível revogar."),
  });

  const link =
    o.token && typeof window !== "undefined"
      ? `${window.location.origin}/onboarding/${o.token.id}`
      : null;

  const canRevoke = o.status !== "concluido" && o.status !== "cancelado";

  return (
    <li
      className="rounded-md border border-border bg-card p-3"
      data-testid="onboarding-row"
      data-onboarding-status={o.status}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
            ONBOARDING_STATUS_TONE[o.status],
          )}
          data-testid="onboarding-status"
        >
          {ONBOARDING_STATUS_LABEL[o.status]}
        </span>
        <span className="text-xs text-muted-foreground">
          {getOnboardingTemplate(o.template_key)?.name ?? o.template_key}
        </span>
      </div>

      <div className="mt-2 grid gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground sm:grid-cols-2">
        <span>Responsável: {o.owner_name ?? "—"}</span>
        <span>Prazo: {fmtDateTime(o.due_at)}</span>
        <span>Enviado em: {fmtDateTime(o.token?.created_at)}</span>
        <span>Iniciado em: {fmtDateTime(o.started_at)}</span>
        <span>Concluído em: {fmtDateTime(o.completed_at)}</span>
        <span>Link expira em: {fmtDateTime(o.token?.expires_at)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        {link && o.status !== "cancelado" && (
          <Button
            size="sm"
            variant="outline"
            data-testid="onboarding-copy-link"
            onClick={() => {
              navigator.clipboard
                .writeText(link)
                .then(() => toast.success("Link de onboarding copiado."))
                .catch(() => toast.error("Não foi possível copiar o link."));
            }}
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.75} />
            Copiar link
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          data-testid="onboarding-view-answers"
          onClick={() => setShowAnswers((v) => !v)}
        >
          <Eye className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.75} />
          {showAnswers ? "Ocultar respostas" : "Visualizar respostas"}
        </Button>
        {canWrite && canRevoke && (
          <Button
            size="sm"
            variant="outline"
            data-testid="onboarding-revoke"
            disabled={revokeMutation.isPending}
            onClick={() => revokeMutation.mutate()}
          >
            {revokeMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Ban className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.75} />
            )}
            Revogar
          </Button>
        )}
      </div>

      {showAnswers && <OnboardingAnswers onboardingId={o.id} />}
    </li>
  );
}

function OnboardingAnswers({ onboardingId }: { onboardingId: string }) {
  const fn = useServerFn(getOnboardingResponseForOperator);
  const query = useQuery({
    queryKey: ["onboarding-response", onboardingId],
    queryFn: () => fn({ data: { onboarding_id: onboardingId } }),
  });

  if (query.isLoading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando respostas…
      </div>
    );
  }
  const response = query.data;
  if (!response) {
    return (
      <p className="mt-3 text-xs text-muted-foreground" data-testid="onboarding-answers-empty">
        Nenhuma resposta registrada ainda.
      </p>
    );
  }

  const template = getOnboardingTemplate(response.template_key);
  if (!template) {
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        Template indisponível para exibição.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3" data-testid="onboarding-answers">
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ClipboardCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
        Atualizado em {fmtDateTime(response.updated_at)}
      </p>
      {template.steps.map((s) => (
        <div key={s.id} className="rounded-md border border-border bg-muted/30 p-2.5">
          <h4 className="text-xs font-semibold text-foreground">{s.title}</h4>
          <dl className="mt-2 space-y-1.5">
            {s.questions.map((q) => (
              <div key={q.id}>
                <dt className="text-[11px] text-muted-foreground">{q.label}</dt>
                <dd className="text-xs text-foreground whitespace-pre-line">
                  {formatAnswer(q, (response.data as Record<string, any>)[q.id])}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
