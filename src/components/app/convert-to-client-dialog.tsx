import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Trophy, Loader2 } from "lucide-react";
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
import { convertLeadToClient } from "@/lib/clients.functions";
import type { Lead } from "@/types/lead";

export function ConvertToClientDialog({
  lead,
  open,
  onOpenChange,
  onConverted,
}: {
  lead: Lead;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConverted?: (clientId: string) => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const convertFn = useServerFn(convertLeadToClient);
  const [pending, setPending] = useState(false);

  const mutation = useMutation({
    mutationFn: () => convertFn({ data: { lead_id: lead.id } }),
    onSuccess: (res) => {
      toast.success("Lead convertido em cliente.");
      qc.invalidateQueries({ queryKey: ["lead", lead.id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["projects-overview"] });
      qc.invalidateQueries({ queryKey: ["clients-overview"] });
      onConverted?.(res.client_id);
      onOpenChange(false);
      navigate({ to: "/os/comercial/clientes/$id", params: { id: res.client_id } });
    },
    onError: (err: Error) =>
      toast.error("Não foi possível converter.", { description: err.message }),
    onSettled: () => setPending(false),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-emerald-600" strokeWidth={1.75} />
            Converter em cliente
          </DialogTitle>
          <DialogDescription>
            Os dados de <strong>{lead.company_name}</strong> serão copiados para a base de
            clientes. O histórico do lead (timeline, propostas e briefings) permanece intacto e
            será vinculado ao novo cliente.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              setPending(true);
              mutation.mutate();
            }}
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Convertendo…
              </>
            ) : (
              "Confirmar conversão"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
