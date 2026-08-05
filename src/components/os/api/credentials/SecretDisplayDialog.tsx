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
import { Key, Copy, Check, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface SecretDisplayDialogProps {
  data: { key_id: string; secret: string } | null;
  onClose: () => void;
  title?: string;
}

export function SecretDisplayDialog({ data, onClose, title = "Nova Credencial Gerada" }: SecretDisplayDialogProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!data) return null;

  return (
    <Dialog open={!!data} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Key className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-destructive font-medium bg-destructive/5 p-2 rounded border border-destructive/10">
            CUIDADO: Este segredo será exibido apenas uma única vez. Nenhum segredo é armazenado em texto plano ou será exibido novamente após fechar este modal.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Key ID</label>
            <div className="flex items-center gap-2 bg-muted p-2.5 rounded-md border font-mono text-sm">
              <span className="flex-1 truncate select-all">{data.key_id}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => copyToClipboard(data.key_id)}
              >
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Secret Key</label>
            <div className="flex items-center gap-2 bg-muted p-2.5 rounded-md border border-primary/20 font-mono text-sm">
              <span className="flex-1 truncate select-all">{data.secret}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => copyToClipboard(data.secret)}
              >
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg flex gap-3 items-start">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-xs text-destructive leading-relaxed">
              <strong>AVISO DE SEGURANÇA:</strong> Após fechar este modal, o segredo nunca mais poderá ser recuperado pela interface. Se você perdê-lo, terá que rotacionar ou revogar a credencial.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button className="w-full" onClick={onClose}>Entendi, salvei a chave</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
