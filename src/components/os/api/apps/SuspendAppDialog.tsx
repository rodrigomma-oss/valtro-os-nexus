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
import { supabase } from "@/integrations/supabase/client";

interface SuspendAppDialogProps {
  application: {
    id: string;
    display_name: string;
    status: 'active' | 'suspended' | 'revoked' | 'pending';
  };
}

export function SuspendAppDialog({ application }: SuspendAppDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const suspendApp = useServerFn(suspendApplicationFn);
  const reactivateApp = useServerFn(reactivateApplicationFn);

  const isSuspended = application.status === 'suspended';
  const actionLabel = isSuspended ? 'Reativar' : 'Suspender';

  const handleToggleStatus = async () => {
    setIsLoading(true);
    try {
      if (isSuspended) {
        await reactivateApp({ data: { id: application.id } });
      } else {
        await suspendApp({ data: { id: application.id } });
      }

      toast.success(`Aplicação ${isSuspended ? 'reativada' : 'suspensa'} com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ['api-applications'] });
      setOpen(false);
    } catch (error: any) {
      console.error(error);
      const message = error.message || 'Erro inesperado ao processar solicitação.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          title={actionLabel}
          className={isSuspended ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"}
        >
          {isSuspended ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{actionLabel} aplicação</DialogTitle>
          <DialogDescription>
            {isSuspended 
              ? "A aplicação voltará a poder autenticar requisições normalmente."
              : "A aplicação perderá acesso à API imediatamente até ser reativada."
            }
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            variant={isSuspended ? "default" : "destructive"} 
            onClick={handleToggleStatus} 
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
