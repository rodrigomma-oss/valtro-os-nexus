"use client";

import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Power, PowerOff, Loader2 } from "lucide-react";
import { suspendApplicationFn, reactivateApplicationFn } from "@/lib/os/api/apps.functions";

interface SuspendAppDialogProps {
  application: {
    id: string;
    display_name: string;
    status: 'active' | 'suspended' | 'revoked' | 'pending';
  };
}

export function SuspendAppDialog({ application }: SuspendAppDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const suspendApp = useServerFn(suspendApplicationFn);
  const reactivateApp = useServerFn(reactivateApplicationFn);

  const isSuspended = application.status === 'suspended';
  const actionTitle = isSuspended ? 'Reativar Aplicação' : 'Suspender Aplicação';

  const handleToggleStatus = async () => {
    setIsSubmitting(true);
    try {
      if (isSuspended) {
        await reactivateApp({ data: { id: application.id } });
        toast.success("Aplicação reativada com sucesso.");
      } else {
        await suspendApp({ data: { id: application.id } });
        toast.success("Aplicação suspensa com sucesso.");
      }

      queryClient.invalidateQueries({ queryKey: ['api-applications'] });
      setOpen(false);
    } catch (error: any) {
      console.error(error);
      const message = error.message || 'Erro inesperado ao processar solicitação.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className={isSuspended 
            ? "text-green-600 hover:text-green-700 hover:bg-green-50" 
            : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
          }
        >
          {isSuspended ? (
            <>
              <Power className="mr-2 h-4 w-4" />
              Reativar
            </>
          ) : (
            <>
              <PowerOff className="mr-2 h-4 w-4" />
              Suspender
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{actionTitle}</DialogTitle>
          <DialogDescription className="space-y-4 pt-2">
            {isSuspended ? (
              <p>Tem certeza que deseja reativar esta aplicação?</p>
            ) : (
              <>
                <p>Tem certeza que deseja suspender esta aplicação?</p>
                <div className="bg-amber-50 p-3 rounded-md border border-amber-100 text-amber-900 text-sm space-y-1">
                  <p className="font-semibold">Enquanto suspensa:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>novas autenticações serão recusadas;</li>
                    <li>credenciais permanecem cadastradas;</li>
                    <li>a aplicação poderá ser reativada posteriormente.</li>
                  </ul>
                </div>
              </>
            )}
            {isSuspended && (
              <p className="text-sm">
                Após a confirmação a aplicação voltará a autenticar normalmente.
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button 
            variant={isSuspended ? "default" : "destructive"} 
            onClick={handleToggleStatus} 
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSuspended ? 'Reativar' : 'Suspender'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
