import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { createProject } from "@/lib/projects.functions";

export function NewProjectDialog({
  open,
  onOpenChange,
  clientId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
  onCreated?: (id: string) => void;
}) {
  const qc = useQueryClient();
  const createFn = useServerFn(createProject);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          client_id: clientId,
          name: name.trim(),
          description: description.trim() || null,
          start_date: startDate || null,
          due_date: dueDate || null,
        },
      }),
    onSuccess: (res) => {
      toast.success("Projeto criado.");
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["projects", "client", clientId] });
      qc.invalidateQueries({ queryKey: ["projects-overview"] });
      onOpenChange(false);
      setName("");
      setDescription("");
      setStartDate("");
      setDueDate("");
      onCreated?.(res.id);
    },
    onError: (err: Error) =>
      toast.error("Não foi possível criar o projeto.", { description: err.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo projeto</DialogTitle>
          <DialogDescription>Cadastre um novo projeto vinculado a este cliente.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="proj-name">Nome do projeto</Label>
            <Input
              id="proj-name"
              placeholder="Ex.: Plataforma comercial — v1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="proj-desc">Descrição (opcional)</Label>
            <Textarea
              id="proj-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="proj-start">Início</Label>
              <Input
                id="proj-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="proj-due">Prazo</Label>
              <Input
                id="proj-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!name.trim() || mutation.isPending}>
            {mutation.isPending ? "Criando…" : "Criar projeto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
