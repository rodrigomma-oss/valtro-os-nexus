/**
 * Sprint 10 — Card do histórico operacional de contatos do Lead.
 * Distinto da timeline automática: aqui ficam registros manuais criados pelo time.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Phone,
  MessageSquare,
  Mail,
  Video,
  MoreHorizontal,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import {
  deleteLeadContact,
  listLeadContacts,
} from "@/lib/contacts.functions";
import {
  CONTACT_CHANNEL_LABEL,
  CONTACT_RESULT_LABEL,
  CONTACT_TYPE_LABEL,
  type LeadContact,
  type LeadContactChannel,
  type LeadContactResult,
} from "@/types/lead";
import { NewContactDialog } from "./new-contact-dialog";

interface Props {
  leadId: string;
  canWrite: boolean;
}

const CHANNEL_ICON: Record<LeadContactChannel, typeof Phone> = {
  whatsapp: MessageSquare,
  email: Mail,
  telefone: Phone,
  reuniao: Video,
  outro: MessageSquare,
};

const RESULT_TONE: Record<LeadContactResult, string> = {
  sem_resposta: "bg-muted text-muted-foreground border-border",
  respondido: "bg-info/10 text-info border-info/20",
  interessado: "bg-success/10 text-success border-success/20",
  nao_interessado: "bg-destructive/10 text-destructive border-destructive/20",
  agendado: "bg-primary/10 text-primary border-primary/20",
  concluido: "bg-success/10 text-success border-success/20",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ContactHistoryCard({ leadId, canWrite }: Props) {
  const qc = useQueryClient();
  const listFn = useServerFn(listLeadContacts);
  const deleteFn = useServerFn(deleteLeadContact);
  const [dialogOpen, setDialogOpen] = useState(false);

  const query = useQuery({
    queryKey: ["lead-contacts", leadId],
    queryFn: () => listFn({ data: { lead_id: leadId } }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["lead-contacts", leadId] });
    qc.invalidateQueries({ queryKey: ["lead", leadId] });
    qc.invalidateQueries({ queryKey: ["follow-ups-overview"] });
  };

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Contato removido.");
      invalidate();
    },
    onError: (err: Error) =>
      toast.error("Não foi possível remover.", { description: err.message }),
  });

  const contacts = query.data ?? [];

  return (
    <>
      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">Histórico de contatos</CardTitle>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Registro operacional dos contatos realizados com o cliente. Complementa a linha do tempo.
            </p>
          </div>
          {canWrite && contacts.length > 0 && (
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              Registrar contato
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {query.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando contatos…
            </div>
          ) : contacts.length === 0 ? (
            <EmptyState
              icon={Phone}
              title="Nenhum contato registrado ainda."
              description={
                canWrite
                  ? "Ao entrar em contato com o cliente, registre aqui para manter o histórico."
                  : "Sem registros de contato para este lead."
              }
              action={
                canWrite ? (
                  <Button onClick={() => setDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" strokeWidth={1.75} />
                    Registrar contato
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="space-y-3">
              {contacts.map((c) => (
                <ContactRow
                  key={c.id}
                  contact={c}
                  canWrite={canWrite}
                  onDelete={() => {
                    if (confirm("Remover este contato do histórico?")) deleteMut.mutate(c.id);
                  }}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <NewContactDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        leadId={leadId}
        onCreated={invalidate}
      />
    </>
  );
}

function ContactRow({
  contact,
  canWrite,
  onDelete,
}: {
  contact: LeadContact;
  canWrite: boolean;
  onDelete: () => void;
}) {
  const Icon = CHANNEL_ICON[contact.channel];
  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {CONTACT_TYPE_LABEL[contact.type]}
              </span>
              <span className="text-xs text-muted-foreground">
                · {CONTACT_CHANNEL_LABEL[contact.channel]}
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-medium",
                  RESULT_TONE[contact.result],
                )}
              >
                {CONTACT_RESULT_LABEL[contact.result]}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {contact.created_by_name ?? "Sistema"} · {formatDate(contact.created_at)}
            </p>
            {contact.notes && (
              <p className="mt-2 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {contact.notes}
              </p>
            )}
          </div>
        </div>
        {canWrite && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </li>
  );
}
