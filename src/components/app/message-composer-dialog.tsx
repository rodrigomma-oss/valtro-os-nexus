/**
 * Sprint 10 — Composer de mensagens com biblioteca + placeholders.
 * Nada é enviado automaticamente; o operador copia e registra manualmente.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Link2, ClipboardCopy, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MESSAGE_CATEGORY_LABEL,
  MESSAGE_LIBRARY,
  templatesByCategory,
  type MessageCategory,
  type MessageTemplate,
} from "@/config/message-library";
import { renderTemplate, firstName } from "@/lib/templates";
import { INTEREST_LABEL, type Lead } from "@/types/lead";
import { NewContactDialog } from "./new-contact-dialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: Lead;
  briefingLink?: string | null;
  canWrite: boolean;
  onContactCreated?: () => void;
}

const CATEGORIES: MessageCategory[] = [
  "desenvolvimento",
  "analise_loja",
  "valtro_pricing",
  "parcerias",
];

type CopyKind = "message" | "link" | "both";

interface PendingRegister {
  template: MessageTemplate;
  kind: CopyKind;
  notes: string;
}

export function MessageComposerDialog({
  open,
  onOpenChange,
  lead,
  briefingLink,
  canWrite,
  onContactCreated,
}: Props) {
  const [category, setCategory] = useState<MessageCategory>("desenvolvimento");
  const [templateId, setTemplateId] = useState<string>(
    templatesByCategory("desenvolvimento")[0]?.id ?? MESSAGE_LIBRARY[0]!.id,
  );
  const [body, setBody] = useState<string>("");

  // Two-stage flow: ask first, then open the Register dialog.
  const [askRegister, setAskRegister] = useState<PendingRegister | null>(null);
  const [registerFor, setRegisterFor] = useState<PendingRegister | null>(null);

  const template = useMemo(
    () => MESSAGE_LIBRARY.find((t) => t.id === templateId) ?? null,
    [templateId],
  );

  const vars = useMemo(
    () => ({
      nome: firstName(lead.contact_name) || lead.contact_name,
      empresa: lead.company_name,
      tipo_interesse: INTEREST_LABEL[lead.service_type],
      link_briefing: briefingLink ?? "",
      responsavel: lead.owner_name ?? "Valtro Labs",
      data: new Date().toLocaleDateString("pt-BR"),
    }),
    [lead, briefingLink],
  );

  useEffect(() => {
    if (!open || !template) return;
    setBody(renderTemplate(template.body, vars));
  }, [open, template, vars]);

  useEffect(() => {
    if (!open) return;
    const list = templatesByCategory(category);
    if (list.length === 0) return;
    if (!list.some((t) => t.id === templateId)) {
      setTemplateId(list[0]!.id);
    }
  }, [category, open, templateId]);

  const doCopy = async (kind: CopyKind) => {
    if (!template) return;
    const message = body.trim();
    const link = briefingLink?.trim() ?? "";
    let text = "";
    if (kind === "message") text = message;
    else if (kind === "link") text = link;
    else text = link ? `${message}\n\n${link}` : message;

    if (!text) {
      toast.error("Nada para copiar.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(
        kind === "message"
          ? "Mensagem copiada."
          : kind === "link"
            ? "Link copiado."
            : "Mensagem e link copiados.",
      );
    } catch {
      toast.error("Não foi possível copiar.");
      return;
    }
    if (canWrite) {
      setAskRegister({ template, kind, notes: message });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" strokeWidth={1.75} />
              Central de comunicação
            </DialogTitle>
            <DialogDescription>
              Escolha um template, revise o texto e copie. Nada é enviado automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Categoria
              </label>
              <Select value={category} onValueChange={(v) => setCategory(v as MessageCategory)}>
                <SelectTrigger className="mt-1.5 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{MESSAGE_CATEGORY_LABEL[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Template
              </label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger className="mt-1.5 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {templatesByCategory(category).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Mensagem
            </label>
            <Textarea
              rows={9}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mt-1.5 font-mono text-[13px] leading-relaxed"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Placeholders resolvidos com dados do lead. Edite antes de copiar se necessário.
            </p>
          </div>

          {!briefingLink && (
            <p className="text-xs text-muted-foreground italic">
              Nenhum briefing ativo — placeholders de link ficarão vazios.
            </p>
          )}

          <DialogFooter className="flex flex-wrap gap-2 sm:justify-end">
            <Button variant="outline" className="gap-2" onClick={() => doCopy("message")}>
              <Copy className="h-4 w-4" strokeWidth={1.75} />
              Copiar mensagem
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              disabled={!briefingLink}
              onClick={() => doCopy("link")}
            >
              <Link2 className="h-4 w-4" strokeWidth={1.75} />
              Copiar link
            </Button>
            <Button className="gap-2" onClick={() => doCopy("both")}>
              <ClipboardCopy className="h-4 w-4" strokeWidth={1.75} />
              Copiar ambos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!askRegister}
        onOpenChange={(o) => !o && setAskRegister(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registrar esta ação no histórico?</AlertDialogTitle>
            <AlertDialogDescription>
              Um contato será registrado com base no template usado. Você pode revisar antes de salvar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Agora não</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (askRegister) setRegisterFor(askRegister);
                setAskRegister(null);
              }}
            >
              Registrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {registerFor && (
        <NewContactDialog
          open={true}
          onOpenChange={(v) => {
            if (!v) setRegisterFor(null);
          }}
          leadId={lead.id}
          defaultChannel={registerFor.template.channelDefault}
          defaultType={registerFor.template.typeDefault}
          defaultNotes={
            registerFor.kind === "link"
              ? "Link do briefing enviado."
              : registerFor.notes
          }
          title="Registrar contato"
          description={`Baseado no template "${registerFor.template.label}".`}
          onCreated={() => {
            onContactCreated?.();
            setRegisterFor(null);
          }}
        />
      )}
    </>
  );
}
