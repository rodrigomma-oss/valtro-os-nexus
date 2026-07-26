/**
 * Sprint 14.1 (etapa final) — Painel de monitoramento do agendamento
 * automático da sincronização com o Google Calendar.
 *
 * Mostra apenas metadados operacionais: horário, contadores e a próxima
 * ação recomendada. Nunca exibe tokens, segredos ou respostas do Google.
 */
import { AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react";

import type { IntegrationStatus } from "@/lib/calendar-integration.functions";
import { cn } from "@/lib/utils";

export interface CalendarAutoSyncPanelProps {
  status: IntegrationStatus;
  className?: string;
}

const FREQUENCY_LABEL = "a cada 2 minutos";

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}

/** Próxima ação recomendada, derivada do estado atual (sem efeitos colaterais). */
function recommendation(status: IntegrationStatus): { tone: "ok" | "warn" | "error"; text: string } {
  if (!status.connected) {
    return { tone: "error", text: "Conecte uma conta Google para que o agendamento tenha efeito." };
  }
  if (!status.calendar_id) {
    return { tone: "warn", text: "Selecione a agenda de destino antes da próxima execução." };
  }
  if (status.queue.falha > 0) {
    return {
      tone: "warn",
      text: "Há itens em falha na fila. Revise o erro abaixo e use “Reprocessar” — o retry automático continua com backoff.",
    };
  }
  if (status.last_cron_result?.skipped) {
    return { tone: "warn", text: `Última execução não processou: ${status.last_cron_result.skipped}` };
  }
  if (!status.last_cron_run_at) {
    return { tone: "warn", text: "Nenhuma execução automática registrada ainda. Aguarde o próximo ciclo." };
  }
  return { tone: "ok", text: "Nenhuma ação necessária." };
}

export function CalendarAutoSyncPanel({ status, className }: CalendarAutoSyncPanelProps) {
  const result = status.last_cron_result;
  const hint = recommendation(status);

  const metrics: Array<[string, string | number]> = [
    ["Processados", result?.processed ?? "—"],
    ["Sincronizados", result?.synced ?? "—"],
    ["Removidos", result?.removed ?? "—"],
    ["Falhas na execução", result?.failed ?? "—"],
  ];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Sincronização automática</h3>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {FREQUENCY_LABEL}
        </span>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border p-3">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">
            Última execução automática
          </dt>
          <dd className="mt-1 text-sm text-foreground">{formatDateTime(status.last_cron_run_at)}</dd>
        </div>
        <div className="rounded-md border border-border p-3">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Estado atual</dt>
          <dd className="mt-1 flex items-center gap-2 text-sm text-foreground">
            {status.worker_running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Execução em andamento
              </>
            ) : (
              "Ocioso"
            )}
          </dd>
        </div>
      </dl>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div
        className={cn(
          "flex items-start gap-2 rounded-md border p-3 text-sm",
          hint.tone === "ok" && "border-border bg-muted/40 text-muted-foreground",
          hint.tone === "warn" && "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
          hint.tone === "error" && "border-destructive/20 bg-destructive/5 text-destructive",
        )}
      >
        {hint.tone === "ok" ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <span>{hint.text}</span>
      </div>
    </div>
  );
}
