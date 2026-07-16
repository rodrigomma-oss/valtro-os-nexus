/**
 * BriefingsCard — Histórico de Briefings (Sprint 2C.2).
 *
 * Novo modelo:
 *  - Botão "Novo briefing" abre o Modal `NewBriefingDialog`.
 *  - Operador escolhe apenas o Serviço; o Template é resolvido no servidor
 *    via `templateTypeForService`.
 *  - Um Lead pode ter vários Briefings, mas somente 1 ATIVO por Serviço.
 *  - Histórico exibe Serviço + Template + Status + datas.
 *  - Compatibilidade com briefings antigos: se `service_type` estiver
 *    presente, usamos o rótulo do catálogo; senão exibimos "—".
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Copy,
  Link2,
  RefreshCcw,
  Ban,
  FileText,
  Plus,
  Loader2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import {
  generateBriefingToken,
  listLeadBriefingTokens,
  resendBriefingToken,
  revokeBriefingToken,
} from "@/lib/briefing.functions";
import type { BriefingToken, ServiceType, TokenStatus } from "@/types/briefing";
import { TEMPLATE_TYPE_LABEL, TOKEN_STATUS_LABEL } from "@/types/briefing";
import type { Lead } from "@/types/lead";
import { briefingServiceLabel } from "@/config/briefing-service-catalog";
import { BriefingViewerDrawer } from "./briefing-viewer-drawer";
import { NewBriefingDialog } from "./new-briefing-dialog";

interface BriefingsCardProps {
  lead: Lead;
  canWrite: boolean;
  onChanged?: () => void;
}

const STATUS_TONE: Record<TokenStatus, string> = {
  pendente: "bg-slate-50 text-slate-700 border-slate-200",
  ativo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  concluido: "bg-blue-50 text-blue-700 border-blue-200",
  expirado: "bg-amber-50 text-amber-700 border-amber-200",
  revogado: "bg-rose-50 text-rose-700 border-rose-200",
};

const ACTIVE_STATUSES: TokenStatus[] = ["pendente", "ativo"];

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildPortalUrl(tokenId: string) {
  if (typeof window === "undefined") return `/briefing/${tokenId}`;
  return `${window.location.origin}/briefing/${tokenId}`;
}

export function BriefingsCard({ lead, canWrite, onChanged }: BriefingsCardProps) {
  const qc = useQueryClient();
  const listFn = useServerFn(listLeadBriefingTokens);
  const generateFn = useServerFn(generateBriefingToken);
  const revokeFn = useServerFn(revokeBriefingToken);
  const resendFn = useServerFn(resendBriefingToken);

  const [viewerToken, setViewerToken] = useState<BriefingToken | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const tokensQuery = useQuery({
    queryKey: ["briefing", "tokens", lead.id],
    queryFn: () => listFn({ data: { lead_id: lead.id } }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["briefing", "tokens", lead.id] });
    qc.invalidateQueries({ queryKey: ["lead", lead.id] });
    qc.invalidateQueries({ queryKey: ["leads-kpis"] });
    onChanged?.();
  };

  const generate = useMutation({
    mutationFn: (service: Exclude<ServiceType, "nao_definido">) =>
      generateFn({
        data: {
          lead_id: lead.id,
          service_type: service,
          // template_type é resolvido no servidor via templateTypeForService.
        },
      }),
    onSuccess: () => {
      toast.success("Briefing gerado.");
      setDialogOpen(false);
      invalidate();
    },
    onError: (err: Error) =>
      toast.error("Não foi possível gerar o briefing.", {
        description: err.message,
      }),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Briefing revogado.");
      invalidate();
    },
    onError: (err: Error) =>
      toast.error("Não foi possível revogar.", { description: err.message }),
  });

  const resend = useMutation({
    mutationFn: (id: string) => resendFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Briefing reenviado. Validade estendida.");
      invalidate();
    },
    onError: (err: Error) =>
      toast.error("Não foi possível reenviar.", { description: err.message }),
  });

  const tokens = tokensQuery.data ?? [];
  const isLoading = tokensQuery.isLoading;

  const canGenerate = canWrite && !lead.archived_at;

  const generateBtn = (
    <Button
      size="sm"
      variant="outline"
      onClick={() => setDialogOpen(true)}
      className="gap-2"
    >
      <Plus className="h-4 w-4" strokeWidth={1.75} />
      Novo briefing
    </Button>
  );

  return (
    <>
      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">Histórico de Briefings</CardTitle>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Histórico de todos os briefings enviados ao cliente durante o
              relacionamento comercial. Cada serviço contratado gera seu
              próprio briefing.
            </p>
          </div>
          {tokens.length > 0 && canGenerate && generateBtn}
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando
              briefings…
            </div>
          ) : tokens.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhum briefing foi gerado para este lead."
              description={
                canGenerate
                  ? "Gere o primeiro briefing consultivo para iniciar o diagnóstico com o cliente."
                  : "Você não tem permissão para gerar briefings."
              }
              action={
                canGenerate ? (
                  <Button
                    onClick={() => setDialogOpen(true)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" strokeWidth={1.75} />
                    Gerar Briefing
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="space-y-3">
              {tokens.map((t) => (
                <BriefingEnvelope
                  key={t.id}
                  token={t}
                  canWrite={canWrite}
                  onOpen={() => setViewerToken(t)}
                  onRevoke={() => revoke.mutate(t.id)}
                  onResend={() => resend.mutate(t.id)}
                  revoking={revoke.isPending && revoke.variables === t.id}
                  resending={resend.isPending && resend.variables === t.id}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <NewBriefingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultService={lead.service_type}
        submitting={generate.isPending}
        onSubmit={(s) => generate.mutate(s)}
      />

      {viewerToken && (
        <BriefingViewerDrawer
          open={!!viewerToken}
          onOpenChange={(o) => !o && setViewerToken(null)}
          token={viewerToken}
        />
      )}
    </>
  );
}

interface BriefingEnvelopeProps {
  token: BriefingToken;
  canWrite: boolean;
  onOpen: () => void;
  onRevoke: () => void;
  onResend: () => void;
  revoking: boolean;
  resending: boolean;
}

function BriefingEnvelope({
  token,
  canWrite,
  onOpen,
  onRevoke,
  onResend,
  revoking,
  resending,
}: BriefingEnvelopeProps) {
  const [copied, setCopied] = useState(false);
  const isActive = ACTIVE_STATUSES.includes(token.status);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(buildPortalUrl(token.id));
      setCopied(true);
      toast.success("Link copiado.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {briefingServiceLabel(token.service_type)}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                STATUS_TONE[token.status],
              )}
            >
              {TOKEN_STATUS_LABEL[token.status]}
            </span>
            <span className="text-xs text-muted-foreground">
              Template · {TEMPLATE_TYPE_LABEL[token.template_type]}
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
            <MetaItem label="Criado em" value={formatDate(token.created_at)} />
            <MetaItem
              label="Último acesso"
              value={formatDate(token.last_access_at)}
            />
            {token.completed_at ? (
              <MetaItem
                label="Concluído em"
                value={formatDate(token.completed_at)}
              />
            ) : (
              <MetaItem label="Expira em" value={formatDate(token.expires_at)} />
            )}
          </dl>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onOpen}>
            <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
            Abrir briefing
          </Button>

          {isActive && canWrite && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={copyLink}
              >
                {copied ? (
                  <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
                ) : (
                  <Link2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                )}
                Copiar link
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={resending}
                onClick={onResend}
              >
                <RefreshCcw
                  className={cn("h-3.5 w-3.5", resending && "animate-spin")}
                  strokeWidth={1.75}
                />
                Reenviar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-destructive hover:text-destructive"
                disabled={revoking}
                onClick={() => {
                  if (confirm("Revogar este briefing?")) onRevoke();
                }}
              >
                <Ban className="h-3.5 w-3.5" strokeWidth={1.75} />
                Revogar
              </Button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </dt>
      <dd className="text-foreground mt-0.5">{value}</dd>
    </div>
  );
}
