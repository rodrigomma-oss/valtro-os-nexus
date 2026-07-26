/**
 * Sprint 14.0 — Card de follow-ups do Lead.
 *
 * O follow-up é uma entidade própria (`follow_ups`) com histórico preservado.
 * Operações distintas: agendar, reagendar, concluir e cancelar.
 * Fuso padrão America/Sao_Paulo e duração explícita.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Ban,
  CalendarCheck,
  CalendarClock,
  History,
  Loader2,
  RefreshCcw,
  UserCog,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { listAssignableUsers } from "@/lib/leads.functions";
import {
  DEFAULT_DURATION_MINUTES,
  DEFAULT_TIMEZONE,
  cancelFollowUp,
  completeFollowUp,
  createFollowUp,
  listLeadFollowUps,
  rescheduleFollowUp,
  type FollowUp,
  type FollowUpStatus,
} from "@/lib/follow-ups.functions";
import type { Lead } from "@/types/lead";

interface Props {
  lead: Lead;
  canWrite: boolean;
  onChanged?: () => void;
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

const STATUS_META: Record<FollowUpStatus, { label: string; className: string }> = {
  agendado: { label: "Agendado", className: "border-primary/20 bg-primary/10 text-primary" },
  concluido: {
    label: "Concluído",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  cancelado: { label: "Cancelado", className: "border-border bg-muted text-muted-foreground" },
  reagendado: {
    label: "Reagendado",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-500",
  },
};

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: DEFAULT_TIMEZONE,
  });
}

export function FollowUpCard({ lead, canWrite, onChanged }: Props) {
  const qc = useQueryClient();
  const listFn = useServerFn(listLeadFollowUps);
  const createFn = useServerFn(createFollowUp);
  const rescheduleFn = useServerFn(rescheduleFollowUp);
  const completeFn = useServerFn(completeFollowUp);
  const cancelFn = useServerFn(cancelFollowUp);
  const listUsersFn = useServerFn(listAssignableUsers);

  const followUpsQuery = useQuery({
    queryKey: ["follow-ups", lead.id],
    queryFn: () => listFn({ data: { lead_id: lead.id } }),
  });

  const usersQuery = useQuery({
    queryKey: ["assignable-users"],
    queryFn: () => listUsersFn(),
    staleTime: 60_000,
    enabled: canWrite,
  });

  const followUps = followUpsQuery.data ?? [];
  const current = useMemo<FollowUp | null>(
    () => followUps.find((f) => f.status === "agendado") ?? null,
    [followUps],
  );
  const history = useMemo(() => followUps.filter((f) => f.status !== "agendado"), [followUps]);

  const [editing, setEditing] = useState(false);
  const [when, setWhen] = useState("");
  const [duration, setDuration] = useState(DEFAULT_DURATION_MINUTES);
  const [reason, setReason] = useState("");
  const [ownerId, setOwnerId] = useState<string>("__none");
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setWhen(toLocalInputValue(current?.scheduled_at ?? null));
    setDuration(current?.duration_minutes ?? DEFAULT_DURATION_MINUTES);
    setReason(current?.reason ?? "");
    setOwnerId(current?.owner_id ?? "__none");
  }, [current?.id, current?.scheduled_at, current?.duration_minutes, current?.reason, current?.owner_id]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["follow-ups", lead.id] });
    qc.invalidateQueries({ queryKey: ["lead", lead.id] });
    qc.invalidateQueries({ queryKey: ["leads"] });
    qc.invalidateQueries({ queryKey: ["follow-ups-overview"] });
    qc.invalidateQueries({ queryKey: ["operations-overview"] });
    onChanged?.();
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const iso = fromLocalInput(when);
      if (!iso) throw new Error("Data inválida.");
      const payload = {
        scheduled_at: iso,
        duration_minutes: duration,
        reason: reason.trim() || null,
        owner_id: ownerId === "__none" ? null : ownerId,
      };
      return current
        ? rescheduleFn({ data: { id: current.id, ...payload } })
        : createFn({ data: { lead_id: lead.id, ...payload } });
    },
    onSuccess: () => {
      toast.success(current ? "Follow-up reagendado." : "Follow-up agendado.");
      setEditing(false);
      invalidate();
    },
    onError: (err: Error) =>
      toast.error("Não foi possível salvar o follow-up.", { description: err.message }),
  });

  const completeMut = useMutation({
    mutationFn: () => {
      if (!current) throw new Error("Nenhum follow-up agendado.");
      return completeFn({ data: { id: current.id } });
    },
    onSuccess: () => {
      toast.success("Follow-up concluído.");
      invalidate();
    },
    onError: (err: Error) => toast.error("Não foi possível concluir.", { description: err.message }),
  });

  const cancelMut = useMutation({
    mutationFn: () => {
      if (!current) throw new Error("Nenhum follow-up agendado.");
      return cancelFn({ data: { id: current.id } });
    },
    onSuccess: () => {
      toast.success("Follow-up cancelado.");
      invalidate();
    },
    onError: (err: Error) => toast.error("Não foi possível cancelar.", { description: err.message }),
  });

  const busy = saveMut.isPending || completeMut.isPending || cancelMut.isPending;
  const overdue = !!current && current.scheduled_at < new Date().toISOString();

  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" strokeWidth={1.75} />
            Próximo follow-up
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Data, duração, motivo e responsável. Fuso {DEFAULT_TIMEZONE}.
          </p>
        </div>
        {current && !editing && (
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
              overdue
                ? "border-destructive/20 bg-destructive/10 text-destructive"
                : STATUS_META.agendado.className,
            )}
          >
            {overdue ? "Vencido" : "Agendado"}
          </span>
        )}
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {followUpsQuery.isLoading && (
          <p className="text-sm text-muted-foreground">Carregando follow-ups…</p>
        )}

        {!editing && current && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Meta label="Data" value={formatDate(current.scheduled_at)} />
            <Meta label="Duração" value={`${current.duration_minutes} min`} />
            <Meta label="Responsável" value={current.owner_name ?? "—"} />
            <Meta label="Motivo" value={current.reason ?? "—"} className="sm:col-span-2" />
          </div>
        )}

        {!editing && !current && !followUpsQuery.isLoading && (
          <p className="text-sm text-muted-foreground italic">
            Nenhum follow-up agendado para este lead.
          </p>
        )}

        {editing && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Data e hora
                </label>
                <Input
                  type="datetime-local"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Duração
                </label>
                <Select
                  value={String(duration)}
                  onValueChange={(v) => setDuration(Number(v))}
                >
                  <SelectTrigger className="mt-1.5 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} minutos
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <UserCog className="h-3.5 w-3.5" strokeWidth={1.75} />
                Responsável
              </label>
              <Select value={ownerId} onValueChange={setOwnerId} disabled={usersQuery.isLoading}>
                <SelectTrigger className="mt-1.5 h-9">
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
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Motivo
              </label>
              <Textarea
                rows={2}
                className="mt-1.5"
                placeholder="Ex: alinhar retorno do briefing, confirmar reunião…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
              />
            </div>
          </div>
        )}

        {canWrite && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {!editing ? (
              <>
                <Button size="sm" onClick={() => setEditing(true)} className="gap-2" disabled={busy}>
                  {current ? (
                    <RefreshCcw className="h-4 w-4" strokeWidth={1.75} />
                  ) : (
                    <CalendarClock className="h-4 w-4" strokeWidth={1.75} />
                  )}
                  {current ? "Reagendar" : "Agendar follow-up"}
                </Button>
                {current && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      disabled={busy}
                      onClick={() => completeMut.mutate()}
                    >
                      {completeMut.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CalendarCheck className="h-4 w-4" strokeWidth={1.75} />
                      )}
                      Concluir
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-2 text-muted-foreground"
                      disabled={busy}
                      onClick={() => cancelMut.mutate()}
                    >
                      {cancelMut.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Ban className="h-4 w-4" strokeWidth={1.75} />
                      )}
                      Cancelar
                    </Button>
                  </>
                )}
              </>
            ) : (
              <>
                <Button size="sm" disabled={saveMut.isPending || !when} onClick={() => saveMut.mutate()}>
                  {saveMut.isPending ? "Salvando…" : "Salvar"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Voltar
                </Button>
              </>
            )}
          </div>
        )}

        {history.length > 0 && (
          <div className="pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              <History className="h-3.5 w-3.5" strokeWidth={1.75} />
              Histórico de follow-ups ({history.length})
            </button>
            {showHistory && (
              <ul className="mt-3 space-y-2">
                {history.map((f) => (
                  <li
                    key={f.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">{formatDate(f.scheduled_at)}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {f.reason ?? "Sem motivo registrado"}
                        {f.cancel_reason ? ` · ${f.cancel_reason}` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        STATUS_META[f.status].className,
                      )}
                    >
                      {STATUS_META[f.status].label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Meta({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm text-foreground mt-0.5">{value}</p>
    </div>
  );
}
