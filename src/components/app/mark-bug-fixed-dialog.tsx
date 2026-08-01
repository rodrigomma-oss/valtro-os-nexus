import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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

/**
 * Diálogo de correção — exige a versão corrigida antes de chamar `markBugFixed`.
 * Nenhum campo novo foi criado no banco; observação não é persistida e por isso
 * não é solicitada.
 */
export function MarkBugFixedDialog({
  open,
  onOpenChange,
  onConfirm,
  submitting,
  defaultVersion,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (fixedVersion: string) => void;
  submitting: boolean;
  defaultVersion?: string | null;
}) {
  const [version, setVersion] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setVersion(defaultVersion ?? "");
      setError(null);
    }
  }, [open, defaultVersion]);

  const submit = () => {
    const value = version.trim();
    if (value.length === 0) {
      setError("Informe a versão em que a correção foi entregue.");
      return;
    }
    setError(null);
    onConfirm(value);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (submitting ? undefined : onOpenChange(v))}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar como corrigido</DialogTitle>
          <DialogDescription>
            A versão corrigida é obrigatória e ficará registrada no histórico do bug.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="bug-fixed-version">Versão corrigida</Label>
          <Input
            id="bug-fixed-version"
            placeholder="Ex.: 1.4.3"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={submitting} onClick={submit}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar correção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
