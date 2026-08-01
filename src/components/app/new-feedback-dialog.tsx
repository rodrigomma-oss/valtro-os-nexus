import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { createFeedback } from "@/lib/os/feedback.functions";
import { listSaasProducts } from "@/lib/saas-products.functions";
import { listAssignableUsers } from "@/lib/leads.functions";
import { listTickets } from "@/lib/tickets.functions";
import { listBugs } from "@/lib/os/bugs.functions";
import {
  FEEDBACK_TYPE_LABEL,
  FEEDBACK_TYPE_ORDER,
  FEEDBACK_SOURCE_LABEL,
  FEEDBACK_SOURCE_ORDER,
  FEEDBACK_VALUE_LABEL,
  FEEDBACK_VALUE_ORDER,
  FEEDBACK_INTEREST_LABEL,
  FEEDBACK_INTEREST_ORDER,
  translateFeedbackError,
} from "@/lib/os/feedback-ui";
import type { 
  FeedbackType, 
  FeedbackSource, 
  FeedbackPerceivedValue, 
  FeedbackSubscriptionInterest 
} from "@/types/feedback";

interface NewFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NONE = "__none__";

export function NewFeedbackDialog({ open, onOpenChange }: NewFeedbackDialogProps) {
  const qc = useQueryClient();
  const createFn = useServerFn(createFeedback);
  const productsFn = useServerFn(listSaasProducts);
  const usersFn = useServerFn(listAssignableUsers);
  const ticketsFn = useServerFn(listTickets);
  const bugsFn = useServerFn(listBugs);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [productId, setProductId] = useState("");
  const [type, setType] = useState<FeedbackType>("suggestion");
  const [source, setSource] = useState<FeedbackSource>("internal");
  const [perceivedValue, setPerceivedValue] = useState<FeedbackPerceivedValue>("not_informed");
  const [interest, setInterest] = useState<FeedbackSubscriptionInterest>("not_informed");
  const [desiredFeature, setDesiredFeature] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [participantEmail, setParticipantEmail] = useState("");
  const [ownerId, setOwnerId] = useState<string>(NONE);
  const [ticketId, setTicketId] = useState<string>(NONE);
  const [bugId, setBugId] = useState<string>(NONE);

  const products = useQuery({
    queryKey: ["saas-products", "active"],
    queryFn: () => productsFn({ data: { activeOnly: true } }),
    enabled: open,
  });

  const users = useQuery({
    queryKey: ["assignable-users"],
    queryFn: () => usersFn(),
    enabled: open,
  });

  const tickets = useQuery({
    queryKey: ["tickets", "open"],
    queryFn: () => ticketsFn({ data: { status: "open", page: 1, pageSize: 50 } }),
    enabled: open,
  });

  const bugs = useQuery({
    queryKey: ["bugs", "active"],
    queryFn: () => bugsFn({ data: { page: 1, pageSize: 50 } }),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      toast.success("Feedback registrado com sucesso.");
      qc.invalidateQueries({ queryKey: ["feedback"] });
      onOpenChange(false);
      reset();
    },
    onError: (err: Error) => {
      toast.error("Não foi possível registrar o feedback.", {
        description: translateFeedbackError(err.message),
      });
    },
  });

  const reset = () => {
    setTitle("");
    setDescription("");
    setProductId("");
    setType("suggestion");
    setSource("internal");
    setPerceivedValue("not_informed");
    setInterest("not_informed");
    setDesiredFeature("");
    setParticipantName("");
    setParticipantEmail("");
    setOwnerId(NONE);
    setTicketId(NONE);
    setBugId(NONE);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      data: {
        title,
        description,
        saas_product_id: productId,
        type,
        source,
        perceived_value: perceivedValue,
        subscription_interest: interest,
        desired_feature: desiredFeature || null,
        participant_name: participantName || null,
        participant_email: participantEmail || null,
        owner_id: ownerId === NONE ? null : ownerId,
        ticket_id: ticketId === NONE ? null : ticketId,
        bug_id: bugId === NONE ? null : bugId,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Novo Feedback</DialogTitle>
            <DialogDescription>
              Registre elogios, sugestões ou falhas de usabilidade identificadas pelos usuários ou pelo time interno.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                placeholder="Ex: Dificuldade em encontrar o botão de exportar"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Detalhe o feedback recebido..."
                className="min-h-[100px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Produto SaaS</Label>
                <Select value={productId} onValueChange={setProductId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.data?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v) => setType(v as FeedbackType)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de feedback" />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_TYPE_ORDER.map((t) => (
                      <SelectItem key={t} value={t}>
                        {FEEDBACK_TYPE_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Origem</Label>
                <Select value={source} onValueChange={(v) => setSource(v as FeedbackSource)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Origem do feedback" />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_SOURCE_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>
                        {FEEDBACK_SOURCE_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valor Percebido</Label>
                <Select 
                  value={perceivedValue} 
                  onValueChange={(v) => setPerceivedValue(v as FeedbackPerceivedValue)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Valor para o usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_VALUE_ORDER.map((v) => (
                      <SelectItem key={v} value={v}>
                        {FEEDBACK_VALUE_LABEL[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Interesse em Assinar</Label>
                <Select 
                  value={interest} 
                  onValueChange={(v) => setInterest(v as FeedbackSubscriptionInterest)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Interesse comercial" />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_INTEREST_ORDER.map((i) => (
                      <SelectItem key={i} value={i}>
                        {FEEDBACK_INTEREST_LABEL[i]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Funcionalidade Desejada</Label>
                <Input
                  placeholder="Ex: Dashboards customizados"
                  value={desiredFeature}
                  onChange={(e) => setDesiredFeature(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="participant_name">Nome do Participante (opcional)</Label>
                <Input
                  id="participant_name"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="participant_email">E-mail do Participante (opcional)</Label>
                <Input
                  id="participant_email"
                  type="email"
                  value={participantEmail}
                  onChange={(e) => setParticipantEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Responsável (opcional)</Label>
                <Select value={ownerId} onValueChange={setOwnerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Atribuir a..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Não atribuído</SelectItem>
                    {users.data?.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Chamado Relacionado (opcional)</Label>
                <Select value={ticketId} onValueChange={setTicketId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vincular chamado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhum</SelectItem>
                    {tickets.data?.items.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.protocol} - {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Bug Relacionado (opcional)</Label>
                <Select value={bugId} onValueChange={setBugId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vincular bug" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhum</SelectItem>
                    {bugs.data?.items.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.code} - {b.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Feedback
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
