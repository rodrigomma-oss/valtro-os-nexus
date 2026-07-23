/**
 * Sprint 10 — Diálogo para registrar um contato operacional.
 * Aceita defaults (canal/tipo) vindos do MessageComposerDialog quando o
 * usuário confirma "Registrar esta ação no histórico?".
 */
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createLeadContact } from "@/lib/contacts.functions";
import {
  CONTACT_CHANNEL_LABEL,
  CONTACT_RESULT_LABEL,
  CONTACT_TYPE_LABEL,
  type LeadContactChannel,
  type LeadContactResult,
  type LeadContactType,
} from "@/types/lead";

const CHANNELS: LeadContactChannel[] = [
  "whatsapp",
  "email",
  "telefone",
  "reuniao",
  "outro",
];
const TYPES: LeadContactType[] = [
  "primeiro_contato",
  "follow_up",
  "envio_briefing",
  "lembrete",
  "apresentacao",
  "proposta",
  "outro",
];
const RESULTS: LeadContactResult[] = [
  "sem_resposta",
  "respondido",
  "interessado",
  "nao_interessado",
  "agendado",
  "concluido",
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leadId: string;
  onCreated?: () => void;
  defaultChannel?: LeadContactChannel;
  defaultType?: LeadContactType;
  defaultNotes?: string;
  title?: string;
  description?: string;
}

export function NewContactDialog({
  open,
  onOpenChange,
  leadId,
  onCreated,
  defaultChannel = "whatsapp",
  defaultType = "primeiro_contato",
  defaultNotes = "",
  title = "Registrar contato",
  description = "Adicione um registro operacional no histórico deste lead.",
}: Props) {
  const createFn = useServerFn(createLeadContact);

  const [channel, setChannel] = useState<LeadContactChannel>(defaultChannel);
  const [type, setType] = useState<LeadContactType>(defaultType);
  const [result, setResult] = useState<LeadContactResult>("sem_resposta");
  const [notes, setNotes] = useState<string>(defaultNotes);

  useEffect(() => {
    if (open) {
      setChannel(defaultChannel);
      setType(defaultType);
      setResult("sem_resposta");
      setNotes(defaultNotes);
    }
  }, [open, defaultChannel, defaultType, defaultNotes]);

  const mutation = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          lead_id: leadId,
          channel,
          type,
          result,
          notes: notes.trim() ? notes.trim() : null,
        },
      }),
    onSuccess: () => {
      toast.success("Contato registrado.");
      onOpenChange(false);
      onCreated?.();
    },
    onError: (err: Error) =>
      toast.error("Não foi possível registrar.", { description: err.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <Field label="Canal">
            <Select value={channel} onValueChange={(v) => setChannel(v as LeadContactChannel)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>{CONTACT_CHANNEL_LABEL[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tipo">
            <Select value={type} onValueChange={(v) => setType(v as LeadContactType)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((c) => (
                  <SelectItem key={c} value={c}>{CONTACT_TYPE_LABEL[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Resultado" className="sm:col-span-2">
            <Select value={result} onValueChange={(v) => setResult(v as LeadContactResult)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RESULTS.map((c) => (
                  <SelectItem key={c} value={c}>{CONTACT_RESULT_LABEL[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="mt-1">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Observações
          </label>
          <Textarea
            rows={4}
            className="mt-1.5"
            placeholder="Contexto do contato, pontos discutidos, próximos passos…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">{notes.length}/2000</p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Salvando…" : "Registrar contato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
