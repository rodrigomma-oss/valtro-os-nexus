/**
 * Sprint 15.2.2B — Dialog de convite de usuário.
 *
 * Formulário simples: e-mail, nome completo e papel. Usa o componente Button
 * oficial e segue o padrão visual do catálogo de serviços.
 */
import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteUser, type AppRole } from "@/lib/admin-users.functions";

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  operator: "Operador",
  viewer: "Visualizador",
};

export interface UserInviteDialogProps {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}

export function UserInviteDialog({ open, onOpenChange }: UserInviteDialogProps) {
  const qc = useQueryClient();
  const inviteFn = useServerFn(inviteUser);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AppRole>("viewer");

  useEffect(() => {
    if (open) {
      setEmail("");
      setFullName("");
      setRole("viewer");
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () =>
      inviteFn({
        data: {
          email: email.trim().toLowerCase(),
          full_name: fullName.trim(),
          role,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-audit-events"] });
      toast.success("Convite enviado.", {
        description: "O usuário receberá um e-mail para ativar a conta.",
      });
      onOpenChange(false);
    },
    onError: (err: Error) =>
      toast.error("Não foi possível enviar o convite.", { description: err.message }),
  });

  const canSubmit = email.trim().length > 0 && fullName.trim().length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar usuário</DialogTitle>
          <DialogDescription>
            Envie um convite por e-mail. O usuário entrará com o papel selecionado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">E-mail</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@valtrolabs.com"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-name">Nome completo</Label>
            <Input
              id="invite-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome do colaborador"
            />
          </div>

          <div className="space-y-2">
            <Label>Papel</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{ROLE_LABEL.admin}</SelectItem>
                <SelectItem value="operator">{ROLE_LABEL.operator}</SelectItem>
                <SelectItem value="viewer">{ROLE_LABEL.viewer}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? "Enviando…" : "Enviar convite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
