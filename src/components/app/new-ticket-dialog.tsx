import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";
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
import { createTicket } from "@/lib/tickets.functions";
import { listSaasProducts } from "@/lib/saas-products.functions";
import { listClients } from "@/lib/clients.functions";
import { listLeads, listAssignableUsers } from "@/lib/leads.functions";
import type { TicketCategory, TicketPriority } from "@/types/ticket";
import {
  TICKET_CATEGORY_LABEL,
  TICKET_CATEGORY_ORDER,
  TICKET_PRIORITY_LABEL,
  TICKET_PRIORITY_ORDER,
} from "@/types/ticket";

const NONE = "__none__";

const ticketSchema = z.object({
  title: z.string().trim().min(4, "Informe um título com pelo menos 4 caracteres.").max(200),
  description: z.string().trim().min(10, "Descreva o chamado com pelo menos 10 caracteres.").max(5000),
  product_id: z.string().uuid("Selecione o produto relacionado."),
  category: z.enum(["support", "question", "commercial", "billing", "technical", "other"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  client_id: z.string().uuid().nullable(),
  lead_id: z.string().uuid().nullable(),
  owner_id: z.string().uuid().nullable(),
});

export function NewTicketDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (id: string) => void;
}) {
  const qc = useQueryClient();
  const createFn = useServerFn(createTicket);
  const servicesFn = useServerFn(listServices);
  const clientsFn = useServerFn(listClients);
  const leadsFn = useServerFn(listLeads);
  const usersFn = useServerFn(listAssignableUsers);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [productId, setProductId] = useState(NONE);
  const [category, setCategory] = useState<TicketCategory>("support");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const [clientId, setClientId] = useState(NONE);
  const [leadId, setLeadId] = useState(NONE);
  const [ownerId, setOwnerId] = useState(NONE);

  const services = useQuery({ queryKey: ["services"], queryFn: () => servicesFn(), enabled: open });
  const clients = useQuery({ queryKey: ["clients"], queryFn: () => clientsFn({ data: {} }), enabled: open });
  const leads = useQuery({ queryKey: ["leads"], queryFn: () => leadsFn({ data: {} }), enabled: open });
  const users = useQuery({ queryKey: ["assignable-users"], queryFn: () => usersFn(), enabled: open });

  const reset = () => {
    setTitle("");
    setDescription("");
    setProductId(NONE);
    setCategory("support");
    setPriority("normal");
    setClientId(NONE);
    setLeadId(NONE);
    setOwnerId(NONE);
  };

  const mutation = useMutation({
    mutationFn: () => {
      const parsed = ticketSchema.parse({
        title,
        description: description.trim(),
        product_id: productId === NONE ? undefined : productId,
        category,
        priority,
        client_id: clientId === NONE ? null : clientId,
        lead_id: leadId === NONE ? null : leadId,
        owner_id: ownerId === NONE ? null : ownerId,
      });
      return createFn({
        data: {
          title: parsed.title,
          description: parsed.description,
          product_id: parsed.product_id,
          category: parsed.category,
          priority: parsed.priority,
          client_id: parsed.client_id,
          lead_id: parsed.lead_id,
          owner_id: parsed.owner_id,
          source: "admin",
        },
      });
    },
    onSuccess: (res) => {
      toast.success(`Chamado ${res.protocol} aberto.`);
      qc.invalidateQueries({ queryKey: ["tickets"] });
      onOpenChange(false);
      reset();
      onCreated?.(res.id);
    },
    onError: (err: Error) => {
      const msg = err instanceof z.ZodError ? err.issues[0]?.message : err.message;
      toast.error("Não foi possível abrir o chamado.", { description: msg });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo chamado</DialogTitle>
          <DialogDescription>
            Registre uma solicitação de atendimento. O protocolo é gerado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          <div className="space-y-1">
            <Label htmlFor="tck-title">Título</Label>
            <Input
              id="tck-title"
              placeholder="Ex.: Divergência de estoque no painel"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="tck-desc">Descrição</Label>
            <Textarea
              id="tck-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Produto</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent>
                  {(services.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_CATEGORY_ORDER.map((c) => (
                    <SelectItem key={c} value={c}>
                      {TICKET_CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_PRIORITY_ORDER.map((p) => (
                    <SelectItem key={p} value={p}>
                      {TICKET_PRIORITY_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Responsável (opcional)</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem responsável</SelectItem>
                  {(users.data ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name ?? "Sem nome"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Cliente (opcional)</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Não vinculado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Não vinculado</SelectItem>
                  {(clients.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Lead (opcional)</Label>
              <Select value={leadId} onValueChange={setLeadId}>
                <SelectTrigger>
                  <SelectValue placeholder="Não vinculado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Não vinculado</SelectItem>
                  {(leads.data ?? []).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={title.trim().length < 4 || mutation.isPending}
          >
            {mutation.isPending ? "Abrindo…" : "Abrir chamado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
