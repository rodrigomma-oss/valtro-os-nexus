import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { upsertProjectOperations } from "@/lib/project-operations.functions";
import {
  ACCESS_STATUS_LABEL,
  ACCESS_STATUS_ORDER,
  WEEKDAY_LABEL,
  type OperationalAccessStatus,
  type ProjectOperations,
} from "@/types/project-operations";

/** "1234,50" | "1234.50" → 123450 centavos. Vazio → null. */
function toCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function fromCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** ISO → valor de <input type="datetime-local"> no fuso local. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ProjectOperationsDialog({
  open,
  onOpenChange,
  projectId,
  operations,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  operations: ProjectOperations | null;
  onSaved?: () => void;
}) {
  const saveFn = useServerFn(upsertProjectOperations);

  const [accessStatus, setAccessStatus] = useState<OperationalAccessStatus>("nao_solicitado");
  const [accessNotes, setAccessNotes] = useState("");
  const [objective, setObjective] = useState("");
  const [adsBudget, setAdsBudget] = useState("");
  const [adsLimit, setAdsLimit] = useState("");
  const [weekday, setWeekday] = useState<string>("none");
  const [nextMeeting, setNextMeeting] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setAccessStatus(operations?.operational_access_status ?? "nao_solicitado");
    setAccessNotes(operations?.operational_access_notes ?? "");
    setObjective(operations?.current_objective ?? "");
    setAdsBudget(fromCents(operations?.ads_monthly_budget_cents));
    setAdsLimit(fromCents(operations?.ads_autonomy_limit_cents));
    setWeekday(
      operations?.meeting_weekday === null || operations?.meeting_weekday === undefined
        ? "none"
        : String(operations.meeting_weekday),
    );
    setNextMeeting(toLocalInput(operations?.next_meeting_at));
    setNotes(operations?.notes ?? "");
  }, [open, operations]);

  const mutation = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          project_id: projectId,
          operational_access_status: accessStatus,
          operational_access_notes: accessNotes.trim() || null,
          current_objective: objective.trim() || null,
          ads_monthly_budget_cents: toCents(adsBudget),
          ads_autonomy_limit_cents: toCents(adsLimit),
          meeting_weekday: weekday === "none" ? null : Number(weekday),
          next_meeting_at: nextMeeting ? new Date(nextMeeting).toISOString() : null,
          notes: notes.trim() || null,
        },
      }),
    onSuccess: () => {
      onOpenChange(false);
      onSaved?.();
    },
    onError: (err: Error) =>
      toast.error("Não foi possível salvar as informações operacionais.", {
        description: err.message,
      }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Informações operacionais</DialogTitle>
          <DialogDescription>
            Somente dados da operação do projeto. Nunca registre senha, token ou qualquer
            credencial de acesso da Shopee — apenas o status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Status do acesso operacional</Label>
              <Select
                value={accessStatus}
                onValueChange={(v) => setAccessStatus(v as OperationalAccessStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCESS_STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {ACCESS_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ops-access-notes">Observações do acesso</Label>
              <Input
                id="ops-access-notes"
                value={accessNotes}
                onChange={(e) => setAccessNotes(e.target.value)}
                placeholder="Ex.: aguardando liberação do subusuário"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="ops-objective">Objetivo atual do acompanhamento</Label>
            <Textarea
              id="ops-objective"
              rows={3}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Ex.: validar 3 produtos e escalar os rentáveis"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="ops-ads-budget">Orçamento mensal de Ads (R$)</Label>
              <Input
                id="ops-ads-budget"
                inputMode="decimal"
                value={adsBudget}
                onChange={(e) => setAdsBudget(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ops-ads-limit">Limite de investimento sem autorização (R$)</Label>
              <Input
                id="ops-ads-limit"
                inputMode="decimal"
                value={adsLimit}
                onChange={(e) => setAdsLimit(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Dia da reunião semanal</Label>
              <Select value={weekday} onValueChange={setWeekday}>
                <SelectTrigger>
                  <SelectValue placeholder="Não definido" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não definido</SelectItem>
                  {Object.entries(WEEKDAY_LABEL).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ops-next-meeting">Próxima reunião</Label>
              <Input
                id="ops-next-meeting"
                type="datetime-local"
                value={nextMeeting}
                onChange={(e) => setNextMeeting(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="ops-notes">Observações operacionais</Label>
            <Textarea
              id="ops-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
