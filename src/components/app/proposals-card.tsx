/**
 * ProposalsCard — Sprint 11.
 * Card no detalhe do Lead com resumo, lista compacta e ações rápidas.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Copy,
  FileText,
  Loader2,
  Plus,
  Receipt,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types/lead";
import {
  PROPOSAL_STATUS_LABEL,
  PROPOSAL_STATUS_TONE,
  type Proposal,
} from "@/types/proposal";
import {
  createProposal,
  deleteProposal,
  duplicateProposal,
  listProposalsByLead,
} from "@/lib/proposals.functions";
import { ProposalDrawer } from "./proposal-drawer";

interface ProposalsCardProps {
  lead: Lead;
  canWrite: boolean;
  isAdmin: boolean;
  /** Sprint 13.10 (P1-5) — proposta a abrir automaticamente (deep-link). */
  focusProposalId?: string;
  /** Ação em contexto solicitada pelo deep-link. */
  focusAction?: "contratacoes";
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ProposalsCard({
  lead,
  canWrite,
  isAdmin,
  focusProposalId,
  focusAction,
}: ProposalsCardProps) {
  const qc = useQueryClient();
  const listFn = useServerFn(listProposalsByLead);
  const createFn = useServerFn(createProposal);
  const dupFn = useServerFn(duplicateProposal);
  const delFn = useServerFn(deleteProposal);

  const [openId, setOpenId] = useState<string | null>(focusProposalId ?? null);
  const [autoContracts, setAutoContracts] = useState(
    Boolean(focusProposalId && focusAction === "contratacoes"),
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newValidUntil, setNewValidUntil] = useState("");

  const proposalsQuery = useQuery({
    queryKey: ["proposals", "lead", lead.id],
    queryFn: () => listFn({ data: { lead_id: lead.id } }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["proposals", "lead", lead.id] });
    qc.invalidateQueries({ queryKey: ["lead", lead.id] });
    qc.invalidateQueries({ queryKey: ["proposals-overview"] });
  };

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          lead_id: lead.id,
          title: newTitle.trim(),
          valid_until: newValidUntil || null,
        },
      }),
    onSuccess: (res) => {
      toast.success("Proposta criada.");
      setCreateOpen(false);
      setNewTitle("");
      setNewValidUntil("");
      invalidate();
      setOpenId(res.id);
    },
    onError: (err: Error) =>
      toast.error("Não foi possível criar a proposta.", { description: err.message }),
  });

  const dup = useMutation({
    mutationFn: (id: string) => dupFn({ data: { id } }),
    onSuccess: (res) => {
      toast.success("Proposta duplicada.");
      invalidate();
      setOpenId(res.id);
    },
    onError: (err: Error) =>
      toast.error("Não foi possível duplicar.", { description: err.message }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Proposta excluída.");
      invalidate();
    },
    onError: (err: Error) =>
      toast.error("Não foi possível excluir.", { description: err.message }),
  });

  const proposals = proposalsQuery.data ?? [];
  const summary = useMemo(() => {
    if (proposals.length === 0) return null;
    const current = proposals[0];
    const total = proposals.reduce((acc, p) => acc + (p.final_amount ?? 0), 0);
    return { count: proposals.length, current, total };
  }, [proposals]);

  const disabled = !canWrite || !!lead.archived_at;

  return (
    <>
      <Card className="shadow-soft" data-testid="proposals-card">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">Propostas</CardTitle>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Gestão comercial das propostas: elaboração, envio, negociação e aprovação.
            </p>
          </div>
          {proposals.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => setCreateOpen(true)}
              disabled={disabled}
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              Nova proposta
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-border bg-muted/30 p-3 text-xs">
              <SummaryStat label="Propostas" value={String(summary.count)} />
              <SummaryStat
                label="Status atual"
                value={
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5",
                      PROPOSAL_STATUS_TONE[summary.current.status],
                    )}
                  >
                    {PROPOSAL_STATUS_LABEL[summary.current.status]}
                  </span>
                }
              />
              <SummaryStat label="Última atualização" value={fmtDate(summary.current.updated_at)} />
              <SummaryStat label="Valor total" value={fmtBRL(summary.total)} />
            </div>
          )}

          {proposalsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando propostas…
            </div>
          ) : proposals.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Nenhuma proposta registrada."
              description={
                disabled
                  ? "Você não tem permissão para criar propostas neste lead."
                  : "Elabore a primeira proposta comercial para este lead."
              }
              action={
                disabled ? undefined : (
                  <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4" strokeWidth={1.75} />
                    Criar proposta
                  </Button>
                )
              }
            />
          ) : (
            <ul className="space-y-2">
              {proposals.map((p) => (
                <ProposalRow
                  key={p.id}
                  proposal={p}
                  canWrite={canWrite}
                  isAdmin={isAdmin}
                  onOpen={() => setOpenId(p.id)}
                  onDuplicate={() => dup.mutate(p.id)}
                  onDelete={() => {
                    if (confirm("Excluir esta proposta?")) remove.mutate(p.id);
                  }}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova proposta</DialogTitle>
            <DialogDescription>
              Crie um rascunho para adicionar itens em seguida.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="prop-title">Título</Label>
              <Input
                id="prop-title"
                placeholder="Ex.: Proposta comercial — Projeto Digital"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prop-valid">Validade (opcional)</Label>
              <Input
                id="prop-valid"
                type="date"
                value={newValidUntil}
                onChange={(e) => setNewValidUntil(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => create.mutate()}
              disabled={!newTitle.trim() || create.isPending}
            >
              {create.isPending ? "Criando…" : "Criar rascunho"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {openId && (
        <ProposalDrawer
          proposalId={openId}
          open={!!openId}
          onOpenChange={(o) => {
            if (!o) {
              setOpenId(null);
              setAutoContracts(false);
            }
          }}
          canWrite={canWrite}
          isAdmin={isAdmin}
          autoOpenContracts={autoContracts && openId === focusProposalId}
          onContractsAutoOpened={() => setAutoContracts(false)}
        />
      )}
    </>
  );
}

function SummaryStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div className="mt-1 text-foreground text-sm font-medium">{value}</div>
    </div>
  );
}

interface ProposalRowProps {
  proposal: Proposal;
  canWrite: boolean;
  isAdmin: boolean;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function ProposalRow({
  proposal: p,
  canWrite,
  isAdmin,
  onOpen,
  onDuplicate,
  onDelete,
}: ProposalRowProps) {
  const canDelete = isAdmin && p.status !== "aprovada";
  return (
    <li className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground truncate">
              {p.number} · {p.title}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                PROPOSAL_STATUS_TONE[p.status],
              )}
            >
              {PROPOSAL_STATUS_LABEL[p.status]}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>Emitida {fmtDate(p.issued_at)}</span>
            {p.valid_until && <span>· Válida até {fmtDate(p.valid_until)}</span>}
            <span>· {fmtBRL(p.final_amount)}</span>
            {p.owner_name && <span>· {p.owner_name}</span>}
          </div>
        </button>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onOpen}>
            <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />
            Abrir
          </Button>
          {canWrite && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={onDuplicate}>
              <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
              Duplicar
            </Button>
          )}
          {canDelete && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
