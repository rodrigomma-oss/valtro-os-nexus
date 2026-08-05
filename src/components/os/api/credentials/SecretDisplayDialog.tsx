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
import { Key, Copy, Check, ShieldAlert, Info } from 'lucide-react';
import { toast } from 'sonner';

interface SecretDisplayDialogProps {
  data: { key_id: string; secret: string } | null;
  onClose: () => void;
  title?: string;
}

export function SecretDisplayDialog({ data, onClose, title = "Nova Credencial Gerada" }: SecretDisplayDialogProps) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const copyToClipboard = (text: string, type: 'key' | 'secret' | 'example') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
    toast.success("Copiado para a área de transferência!");
  };

  if (!data) return null;

  return (
    <Dialog open={!!data} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] w-[95vw] p-0 overflow-hidden flex flex-col max-h-[92vh]">
        <div className="p-6 pb-0">
          <DialogHeader className="space-y-2 pb-2">
            <DialogTitle className="flex items-center gap-2 text-primary text-xl mb-1">
              <Key className="h-5 w-5" />
              {title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              Este segredo será exibido apenas uma única vez. Guarde-o em um local seguro.
            </DialogDescription>
            
            <div className="mt-4 bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg flex gap-3 items-start">
              <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700 leading-relaxed font-medium break-words">
                CUIDADO: Nenhum segredo é armazenado em texto plano ou será exibido novamente após fechar este modal.
              </div>
            </div>
          </DialogHeader>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 pt-2">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Key ID</label>
                <div className="flex items-center gap-2 bg-muted/50 p-3 rounded-md border font-mono text-sm group transition-colors hover:bg-muted focus-within:ring-1 focus-within:ring-primary/20">
                  <span className="flex-1 truncate select-all font-mono tracking-tight">{data.key_id}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 shrink-0"
                    onClick={() => copyToClipboard(data.key_id, 'key')}
                  >
                    {copiedKey ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Secret Key</label>
                <div className="flex items-center gap-2 bg-muted/50 p-3 rounded-md border border-primary/20 font-mono text-sm group transition-colors hover:bg-muted focus-within:ring-1 focus-within:ring-primary/20">
                  <span className="flex-1 truncate select-all font-mono tracking-tight">{data.secret}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 shrink-0"
                    onClick={() => copyToClipboard(data.secret, 'secret')}
                  >
                    {copiedSecret ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg flex gap-3 items-start">
              <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-xs text-destructive leading-relaxed font-medium break-words">
                <strong>AVISO CRÍTICO:</strong> Após fechar este modal, o segredo nunca mais poderá ser recuperado. Se você perdê-lo, terá que rotacionar ou revogar a credencial.
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">
                Exemplos de Integração
              </h4>
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-slate-950 p-3 rounded-lg border border-white/10 overflow-hidden">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-white/40 font-mono font-medium">cURL (VALTRO-HMAC-SHA256-V1)</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-white/40 hover:text-white hover:bg-white/10"
                      onClick={() => {
                        const ts = Date.now().toString();
                        const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                        const curl = `# Protocolo: VALTRO-HMAC-SHA256-V1\nTS="${ts}"\nNONCE="${nonce}"\nKEY_ID="${data.key_id}"\nSECRET="${data.secret}"\nCANONICAL="VALTRO-HMAC-SHA256-V1\\n$TS\\n$NONCE\\nGET\\n/api/v1/meta\\n\\napplication/json\\ne3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"\nSIGNATURE=$(echo -n "$CANONICAL" | openssl dgst -sha256 -hmac "$SECRET" -hex | sed 's/.* //')\n\ncurl -X GET "https://valtrolabs.pro/api/v1/meta" \\\n  -H "x-valtro-key-id: $KEY_ID" \\\n  -H "x-valtro-timestamp: $TS" \\\n  -H "x-valtro-nonce: $NONCE" \\\n  -H "x-valtro-signature: $SIGNATURE" \\\n  -H "content-type: application/json"`;
                        copyToClipboard(curl, 'example');
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <pre className="text-[10px] text-emerald-400 font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                    curl -X GET "https://valtrolabs.pro/api/v1/meta" \<br />
                    &nbsp;&nbsp;-H "x-valtro-key-id: {data.key_id.substring(0, 12)}..." \<br />
                    &nbsp;&nbsp;-H "x-valtro-signature: [hmac-sha256]"
                  </pre>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-white/10 overflow-hidden">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-white/40 font-mono font-medium">JavaScript (Node.js)</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-white/40 hover:text-white hover:bg-white/10"
                      onClick={() => {
                        const js = `const crypto = require('crypto');\n\nconst keyId = '${data.key_id}';\nconst secret = '${data.secret}';\nconst timestamp = Date.now().toString();\nconst nonce = crypto.randomBytes(16).toString('hex');\nconst method = 'GET';\nconst path = '/api/v1/meta';\nconst bodyHash = crypto.createHash('sha256').update('').digest('hex');\n\nconst canonical = [\n  'VALTRO-HMAC-SHA256-V1',\n  timestamp,\n  nonce,\n  method,\n  path,\n  '', // query string\n  'application/json',\n  bodyHash\n].join('\\n');\n\nconst signature = crypto.createHmac('sha256', secret).update(canonical).digest('hex');\n\nfetch('https://valtrolabs.pro/api/v1/meta', {\n  headers: {\n    'x-valtro-key-id': keyId,\n    'x-valtro-timestamp': timestamp,\n    'x-valtro-nonce': nonce,\n    'x-valtro-signature': signature,\n    'content-type': 'application/json'\n  }\n});`;
                        copyToClipboard(js, 'example');
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <pre className="text-[10px] text-blue-400 font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                    const canonical = ['VALTRO-HMAC-SHA256-V1', ts, nonce, 'GET', ...].join('\n');<br />
                    const sig = crypto.createHmac('sha256', secret).update(canonical).digest('hex');
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 bg-background border-t">
          <Button className="w-full sm:w-auto px-8" onClick={onClose}>Entendi, salvei as chaves</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
