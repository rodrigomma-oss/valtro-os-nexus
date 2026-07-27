/**
 * CyclePaymentDialog — Sprint 13.7 (controle financeiro básico do ciclo).
 *
 * Escopo deliberadamente mínimo: registrar o que aconteceu com o pagamento
 * de um período. Não é contas a receber, não é gateway, não emite nada.
 *
 * Invariantes respeitadas pela UI (e garantidas por trigger no banco):
 * - `amount_cents` (previsto) é somente leitura — snapshot imutável.
 * - `paid_amount_cents` só existe quando o status é "pago".
 * - Vencimento padrão é `period_start`; alterar é exceção explícita.
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { registerCyclePayment } from "@/lib/client-service-cycles.functions";
import {
  CYCLE_PAYMENT_METHODS,
  CYCLE_PAYMENT_METHOD_LABEL,
  CYCLE_PAYMENT_STATUS_LABEL,
  type ClientServiceCycle,
  type CyclePaymentMethod,
  type CyclePaymentStatus,
} from "@/types/client-service";

interface CyclePaymentDialogProps {
  cycle: ClientServiceCycle;
  onSaved: () => void;
}

/** Status oferecidos ao operador — `vencido` é derivado, não escolhido. */
const SELECTABLE_STATUS: readonly CyclePaymentStatus[] = ["pendente", "pago", "dispensado"];

function centsToInput(cents: number | null): string {
  if (cents === null) return "";
  return (cents / 100).toFixed(2);
}

function inputToCents(value: string): number | null {
  const normalized = value.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (normalized === "") return null;
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

export function CyclePaymentDialog({ cycle, onSaved }: CyclePaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<CyclePaymentStatus>(
    cycle.payment_status === "vencido" ? "pendente" : cycle.payment_status,
  );
  const [amount, setAmount] = useState(
    centsToInput(cycle.paid_amount_cents ?? cycle.amount_cents),
  );
  const [paidAt, setPaidAt] = useState(
    (cycle.paid_at ?? new Date().toISOString()).slice(0, 10),
  );
  const [method, setMethod] = useState<CyclePaymentMethod | "">(
    (cycle.payment_method as CyclePaymentMethod | null) ?? "",
  );
  const [dueDate, setDueDate] = useState(cycle.due_date ?? cycle.period_start);
  const [notes, setNotes] = useState(cycle.payment_notes ?? "");

  const registerFn = useServerFn(registerCyclePayment);

  const mutation = useMutation({
    mutationFn: () => {
      const paid = status === "pago" ? inputToCents(amount) : null;
      if (status === "pago" && paid === null) {
        throw new Error("Informe o valor recebido para marcar o ciclo como pago.");
      }
      return registerFn({
        data: {
          id: cycle.id,
          payment_status: status,
          paid_amount_cents: paid,
          paid_at: status === "pago" ? new Date(`${paidAt}T12:00:00`).toISOString() : null,
          payment_method: status === "pago" && method !== "" ? method : null,
          payment_notes: notes.trim() === "" ? null : notes.trim(),
          due_date: dueDate,
        },
      });
    },
    onSuccess: () => {
      toast.success(`Pagamento do ciclo #${cycle.sequence} atualizado.`);
      setOpen(false);
      onSaved();
    },
    onError: (err: Error) =>
      toast.error(err.message || "Não foi possível registrar o pagamento."),
  });

  const previewCents = inputToCents(amount);
  const divergent =
    status === "pago" && previewCents !== null && previewCents !== cycle.amount_cents;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid="cycle-payment-action">
          <Wallet className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.75} />
          Registrar pagamento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="cycle-payment-dialog">
        <DialogHeader>
          <DialogTitle>Pagamento · ciclo #{cycle.sequence}</DialogTitle>
          <DialogDescription>
            Valor previsto{" "}
            {(cycle.amount_cents / 100).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}{" "}
            — snapshot imutável do ciclo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cycle-payment-status">Status do pagamento</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as CyclePaymentStatus)}
            >
              <SelectTrigger id="cycle-payment-status" data-testid="cycle-payment-status-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SELECTABLE_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {CYCLE_PAYMENT_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cycle-due-date">Vencimento</Label>
            <Input
              id="cycle-due-date"
              type="date"
              value={dueDate}
              data-testid="cycle-due-date-input"
              onChange={(e) => setDueDate(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Padrão: início do período ({cycle.period_start.split("-").reverse().join("/")}).
            </p>
          </div>

          {status === "pago" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="cycle-paid-amount">Valor recebido (R$)</Label>
                <Input
                  id="cycle-paid-amount"
                  inputMode="decimal"
                  value={amount}
                  data-testid="cycle-paid-amount-input"
                  onChange={(e) => setAmount(e.target.value)}
                />
                {divergent && (
                  <p
                    className="text-[11px] text-amber-700"
                    data-testid="cycle-payment-divergence"
                  >
                    Valor recebido diferente do previsto — será registrado como está.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cycle-paid-at">Data do pagamento</Label>
                  <Input
                    id="cycle-paid-at"
                    type="date"
                    value={paidAt}
                    data-testid="cycle-paid-at-input"
                    onChange={(e) => setPaidAt(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cycle-method">Forma</Label>
                  <Select value={method} onValueChange={(v) => setMethod(v as CyclePaymentMethod)}>
                    <SelectTrigger id="cycle-method" data-testid="cycle-method-select">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {CYCLE_PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {CYCLE_PAYMENT_METHOD_LABEL[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="cycle-payment-notes">Observação (opcional)</Label>
            <Textarea
              id="cycle-payment-notes"
              rows={2}
              maxLength={500}
              value={notes}
              data-testid="cycle-payment-notes-input"
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            data-testid="cycle-payment-submit"
          >
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
