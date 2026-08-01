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
import {
  createParticipant,
  listBetaProgramsForParticipants,
} from "@/lib/os/beta-participants.functions";
import {
  BETA_PARTICIPANT_INTEREST_LABEL,
  BETA_PARTICIPANT_INTEREST_ORDER,
  translateBetaParticipantError,
} from "@/lib/os/beta-participants-ui";
import type { BetaParticipantInterest } from "@/types/beta-participant";

interface NewBetaParticipantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewBetaParticipantDialog({ open, onOpenChange }: NewBetaParticipantDialogProps) {
  const qc = useQueryClient();
  const createFn = useServerFn(createParticipant);
  const programsFn = useServerFn(listBetaProgramsForParticipants);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [programId, setProgramId] = useState("");
  const [interest, setInterest] = useState<BetaParticipantInterest>("unknown");
  const [notes, setNotes] = useState("");

  const programs = useQuery({
    queryKey: ["beta-programs", "for-participants"],
    queryFn: () => programsFn(),
    enabled: open,
  });

  const reset = () => {
    setName("");
    setEmail("");
    setProgramId("");
    setInterest("unknown");
    setNotes("");
  };

  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: (result) => {
      toast.success(`Participante ${result.code} cadastrado com sucesso.`);
      qc.invalidateQueries({ queryKey: ["beta-participants"] });
      onOpenChange(false);
      reset();
    },
    onError: (err: Error) => {
      toast.error("Não foi possível cadastrar o participante.", {
        description: translateBetaParticipantError(err.message),
      });
    },
  });

  const selectedProgram = programs.data?.find((p) => p.id === programId);
  const canSubmit =
    name.trim().length >= 2 && /\S+@\S+\.\S+/.test(email.trim()) && !!selectedProgram;

  const submit = () => {
    if (!selectedProgram) return;
    createMutation.mutate({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        beta_program_id: selectedProgram.id,
        saas_product_id: selectedProgram.saas_product_id,
        interest_to_subscribe: interest,
        notes: notes.trim() ? notes.trim() : null,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo participante do beta</DialogTitle>
          <DialogDescription>
            O código do participante é gerado automaticamente pelo sistema no padrão BTP-000000. O
            cadastro inicia sempre na situação Convidado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="btp-program">Programa beta</Label>
            <Select value={programId} onValueChange={setProgramId}>
              <SelectTrigger id="btp-program">
                <SelectValue placeholder="Selecione o programa beta" />
              </SelectTrigger>
              <SelectContent>
                {programs.data?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="btp-name">Nome do participante</Label>
            <Input
              id="btp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="btp-email">E-mail</Label>
            <Input
              id="btp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="participante@empresa.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="btp-interest">Interesse em assinar</Label>
            <Select
              value={interest}
              onValueChange={(v) => setInterest(v as BetaParticipantInterest)}
            >
              <SelectTrigger id="btp-interest">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BETA_PARTICIPANT_INTEREST_ORDER.map((i) => (
                  <SelectItem key={i} value={i}>
                    {BETA_PARTICIPANT_INTEREST_LABEL[i]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="btp-notes">Observações internas</Label>
            <Textarea
              id="btp-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexto do convite, origem do contato, combinados…"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!canSubmit || createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Cadastrar participante
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
