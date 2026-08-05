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

        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
            Exemplos de Implementação
          </h4>
          <div className="grid grid-cols-1 gap-2">
            <div className="bg-black/90 p-3 rounded-md border border-white/10 overflow-hidden group relative">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-white/50 font-mono">cURL (Bash)</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-white/50 hover:text-white"
                  onClick={() => {
                    const ts = Date.now().toString();
                    const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                    const curl = `# Protocolo: VALTRO-HMAC-SHA256-V1\nTS="${ts}"\nNONCE="${nonce}"\nKEY_ID="${data.key_id}"\nSECRET="${data.secret}"\nCANONICAL="VALTRO-HMAC-SHA256-V1\\n$TS\\n$NONCE\\nGET\\n/api/v1/meta\\n\\napplication/json\\ne3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"\nSIGNATURE=$(echo -n "$CANONICAL" | openssl dgst -sha256 -hmac "$SECRET" -hex | sed 's/.* //')\n\ncurl -X GET "https://valtrolabs.pro/api/v1/meta" \\\n  -H "x-valtro-key-id: $KEY_ID" \\\n  -H "x-valtro-timestamp: $TS" \\\n  -H "x-valtro-nonce: $NONCE" \\\n  -H "x-valtro-signature: $SIGNATURE" \\\n  -H "content-type: application/json"`;
                    copyToClipboard(curl);
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <pre className="text-[10px] text-emerald-400 font-mono overflow-x-auto leading-relaxed">
                curl -X GET "https://valtrolabs.pro/api/v1/meta" \<br />
                &nbsp;&nbsp;-H "x-valtro-key-id: {data.key_id.substring(0, 8)}..." \<br />
                &nbsp;&nbsp;-H "x-valtro-signature: [hmac-sha256]"
              </pre>
            </div>

            <div className="bg-black/90 p-3 rounded-md border border-white/10 overflow-hidden group relative">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-white/50 font-mono">JavaScript (Node/Fetch)</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-white/50 hover:text-white"
                  onClick={() => {
                    const js = `const crypto = require('crypto');\n\nconst keyId = '${data.key_id}';\nconst secret = '${data.secret}';\nconst timestamp = Date.now().toString();\nconst nonce = crypto.randomBytes(16).toString('hex');\nconst method = 'GET';\nconst path = '/api/v1/meta';\nconst bodyHash = crypto.createHash('sha256').update('').digest('hex');\n\nconst canonical = [\n  'VALTRO-HMAC-SHA256-V1',\n  timestamp,\n  nonce,\n  method,\n  path,\n  '', // query string\n  'application/json',\n  bodyHash\n].join('\\n');\n\nconst signature = crypto.createHmac('sha256', secret).update(canonical).digest('hex');\n\nfetch('https://valtrolabs.pro/api/v1/meta', {\n  headers: {\n    'x-valtro-key-id': keyId,\n    'x-valtro-timestamp': timestamp,\n    'x-valtro-nonce': nonce,\n    'x-valtro-signature': signature,\n    'content-type': 'application/json'\n  }\n});`;
                    copyToClipboard(js);
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <pre className="text-[10px] text-blue-400 font-mono overflow-x-auto leading-relaxed">
                const canonical = ['VALTRO-HMAC-SHA256-V1', ts, nonce, 'GET', ...].join('\n');<br />
                const sig = crypto.createHmac('sha256', secret).update(canonical).digest('hex');
              </pre>
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
