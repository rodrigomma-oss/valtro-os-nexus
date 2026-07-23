/**
 * Sprint 10 — Card de gestão do próximo follow-up do Lead.
 * Reutiliza `listAssignableUsers` para atribuição.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarClock, CalendarCheck, Loader2, UserCog } from "lucide-react";
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
import {
  completeLeadFollowUp,
  listAssignableUsers,
  setLeadFollowUp,
} from "@/lib/leads.functions";
import type { Lead } from "@/types/lead";

interface Props {
  lead: Lead;
  canWrite: boolean;
  onChanged?: () => void;
}

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
  });
}

export function FollowUpCard({ lead, canWrite, onChanged }: Props) {
  const qc = useQueryClient();
  const setFn = useServerFn(setLeadFollowUp);
  const completeFn = useServerFn(completeLeadFollowUp);
  const listUsersFn = useServerFn(listAssignableUsers);

  const usersQuery = useQuery({
    queryKey: ["assignable-users"],
    queryFn: () => listUsersFn(),
    staleTime: 60_000,
    enabled: canWrite,
  });

  const scheduled = !!lead.next_follow_up_at;
  const [editing, setEditing] = useState(false);
  const [when, setWhen] = useState(toLocalInputValue(lead.next_follow_up_at));
  const [reason, setReason] = useState(lead.next_follow_up_reason ?? "");
  const [ownerId, setOwnerId] = useState<string>(lead.next_follow_up_owner_id ?? "__none");

  useEffect(() => {
    setWhen(toLocalInputValue(lead.next_follow_up_at));
    setReason(lead.next_follow_up_reason ?? "");
    setOwnerId(lead.next_follow_up_owner_id ?? "__none");
  }, [lead.next_follow_up_at, lead.next_follow_up_reason, lead.next_follow_up_owner_id]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["lead", lead.id] });
    qc.invalidateQueries({ queryKey: ["leads"] });
    qc.invalidateQueries({ queryKey: ["follow-ups-overview"] });
    qc.invalidateQueries({ queryKey: ["operations-overview"] });
    onChanged?.();
  };

  const setMut = useMutation({
    mutationFn: () => {
      const iso = fromLocalInput(when);
      if (!iso) throw new Error("Data inválida.");
      return setFn({
        data: {
          id: lead.id,
          at: iso,
          reason: reason.trim() || null,
          owner_id: ownerId === "__none" ? null : ownerId,
        },
      });
    },
    onSuccess: () => {
      toast.success("Follow-up agendado.");
      setEditing(false);
      invalidate();
    },
    onError: (err: Error) =>
      toast.error("Não foi possível agendar.", { description: err.message }),
  });

  const completeMut = useMutation({
    mutationFn: () => completeFn({ data: { id: lead.id } }),
    onSuccess: () => {
      toast.success("Follow-up concluído.");
      invalidate();
    },
    onError: (err: Error) =>
      toast.error("Não foi possível concluir.", { description: err.message }),
  });

  const ownerName =
    (usersQuery.data ?? []).find((u) => u.id === lead.next_follow_up_owner_id)?.full_name ??
    (lead.next_follow_up_owner_id ? "Responsável atribuído" : null);

  const overdue =
    scheduled && lead.next_follow_up_at! < new Date().toISOString();

  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" strokeWidth={1.75} />
            Próximo follow-up
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Agende o próximo contato com data, motivo e responsável.
          </p>
        </div>
        {scheduled && !editing && (
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
              overdue
                ? "border-destructive/20 bg-destructive/10 text-destructive"
                : "border-primary/20 bg-primary/10 text-primary",
            )}
          >
            {overdue ? "Vencido" : "Agendado"}
          </span>
        )}
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {!editing && scheduled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Meta label="Data" value={formatDate(lead.next_follow_up_at)} />
            <Meta label="Responsável" value={ownerName ?? "—"} />
            <Meta
              label="Motivo"
              value={lead.next_follow_up_reason ?? "—"}
              className="sm:col-span-2"
            />
          </div>
        )}

        {!editing && !scheduled && (
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
                <Button size="sm" onClick={() => setEditing(true)} className="gap-2">
                  <CalendarClock className="h-4 w-4" strokeWidth={1.75} />
                  {scheduled ? "Reagendar" : "Agendar follow-up"}
                </Button>
                {scheduled && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    disabled={completeMut.isPending}
                    onClick={() => completeMut.mutate()}
                  >
                    {completeMut.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CalendarCheck className="h-4 w-4" strokeWidth={1.75} />
                    )}
                    Marcar como concluído
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  disabled={setMut.isPending || !when}
                  onClick={() => setMut.mutate()}
                >
                  {setMut.isPending ? "Salvando…" : "Salvar"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
              </>
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
