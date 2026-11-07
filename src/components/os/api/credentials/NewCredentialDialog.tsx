import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Key, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getApplications } from '@/lib/os/api/apps.functions';
import { useServerFn } from '@tanstack/react-start';
import { createCredentialFn } from '@/lib/os/api/credentials.functions';
import { toast } from 'sonner';

interface NewCredentialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (data: { key_id: string; secret: string }) => void;
}

export function NewCredentialDialog({ open, onOpenChange, onSuccess }: NewCredentialDialogProps) {
  const [applicationId, setApplicationId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: applications, isLoading: isLoadingApps } = useQuery({
    queryKey: ['api-applications-simple'],
    queryFn: () => getApplications(),
    enabled: open,
  });

  const createFn = useServerFn(createCredentialFn);

  const handleCreate = async () => {
    if (!applicationId) return;
    
    setIsSubmitting(true);
    try {
      const result = await createFn({ data: { applicationId } });
      onSuccess(result as { key_id: string; secret: string });
      onOpenChange(false);
      setApplicationId("");
      toast.success("Credencial gerada com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar credencial. Verifique as permissões.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Nova Credencial
          </DialogTitle>
          <DialogDescription>
            Selecione uma aplicação para gerar um novo par de chaves de acesso.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="application">Aplicação</Label>
            <Select 
              value={applicationId} 
              onValueChange={setApplicationId}
              disabled={isSubmitting || isLoadingApps}
            >
              <SelectTrigger id="application">
                <SelectValue placeholder={isLoadingApps ? "Carregando aplicações..." : "Selecione uma aplicação"} />
              </SelectTrigger>
              <SelectContent>
                {applications?.map((app) => (
                  <SelectItem key={app.id} value={app.id}>
                    {app.display_name} ({app.environment})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={!applicationId || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gerar Credencial
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
