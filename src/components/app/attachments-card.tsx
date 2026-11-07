import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  prepareAttachmentUploadFn,
  finalizeAttachmentUploadFn,
  getAttachmentDownloadUrlFn,
  deleteAttachmentFn,
  listAttachmentsFn,
} from "@/lib/os/attachments/attachments.functions";

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Card de anexos — reutiliza integralmente o backend de anexos da VOS-001B.2A
 * (URLs assinadas + exclusão lógica). Nenhum uploader novo foi criado no banco.
 */
export function AttachmentsCard({
  entityType,
  entityId,
  canWrite,
}: {
  entityType: string;
  entityId: string;
  canWrite: boolean;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const listFn = useServerFn(listAttachmentsFn);
  const prepareFn = useServerFn(prepareAttachmentUploadFn);
  const finalizeFn = useServerFn(finalizeAttachmentUploadFn);
  const downloadFn = useServerFn(getAttachmentDownloadUrlFn);
  const removeFn = useServerFn(deleteAttachmentFn);

  const queryKey = ["attachments", entityType, entityId];
  const listQuery = useQuery({
    queryKey,
    queryFn: () => listFn({ data: { entityType, entityId } }),
  });

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const prepared = await prepareFn({
        data: {
          entityType,
          entityId,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        },
      });
      const res = await fetch(prepared.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!res.ok) throw new Error("Falha no envio do arquivo.");
      await finalizeFn({
        data: { attachmentId: prepared.attachmentId, storagePath: prepared.storagePath },
      });
      toast.success("Anexo enviado.");
      qc.invalidateQueries({ queryKey });
    } catch (err) {
      toast.error("Não foi possível anexar o arquivo.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeMutation = useMutation({
    mutationFn: (attachmentId: string) => removeFn({ data: { attachmentId } }),
    onSuccess: () => {
      toast.success("Anexo removido.");
      qc.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => toast.error("Não foi possível remover.", { description: err.message }),
  });

  const openDownload = async (attachmentId: string) => {
    try {
      const { url } = await downloadFn({ data: { attachmentId } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error("Não foi possível gerar o link.", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const items = listQuery.data ?? [];

  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">Anexos</CardTitle>
        {canWrite && (
          <>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Anexar
            </Button>
          </>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {listQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando anexos…</p>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Paperclip}
            title="Nenhum anexo"
            description="Envie arquivos relacionados a este chamado (limite de 5 por registro)."
          />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2.5">
                <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {a.original_filename}
                  </p>
                  <p className="text-xs text-muted-foreground">{fmtSize(a.size_bytes)}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => void openDownload(a.id)}>
                  <Download className="h-4 w-4" />
                </Button>
                {canWrite && (
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={removeMutation.isPending}
                    onClick={() => removeMutation.mutate(a.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
