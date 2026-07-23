/**
 * ProposalDrawer — Sprint 11.
 * Modal amplo (Dialog) com 3 abas: Itens · Negociação · Detalhes.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronDown,
  Loader2,
  MessageSquarePlus,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  addNegotiationEntry,
  addProposalItem,
  getProposal,
  removeProposalItem,
  updateProposal,
  updateProposalItem,
  updateProposalStatus,
} from "@/lib/proposals.functions";
import {
  NEGOTIATION_TYPE_LABEL,
  PROPOSAL_STATUS_LABEL,
  PROPOSAL_STATUS_ORDER,
  PROPOSAL_STATUS_TONE,
  type ProposalNegotiationType,
  type ProposalStatus,
} from "@/types/proposal";
import {
  CATEGORY_LABEL,
  SERVICE_LIBRARY,
  groupServiceLibrary,
  type ServiceCategory,
} from "@/config/service-library";

interface ProposalDrawerProps {
  proposalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canWrite: boolean;
  isAdmin: boolean;
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ProposalDrawer({
  proposalId,
  open,
  onOpenChange,
  canWrite,
}: ProposalDrawerProps) {
  const qc = useQueryClient();
  const getFn = useServerFn(getProposal);
  const updateFn = useServerFn(updateProposal);
  const statusFn = useServerFn(updateProposalStatus);
  const addItemFn = useServerFn(addProposalItem);
  const updItemFn = useServerFn(updateProposalItem);
  const rmItemFn = useServerFn(removeProposalItem);
  const addNegFn = useServerFn(addNegotiationEntry);

  const query = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => getFn({ data: { id: proposalId } }),
    enabled: open,
  });

  const proposal = query.data?.proposal;
  const items = query.data?.items ?? [];
  const negotiations = query.data?.negotiations ?? [];

  // Detalhes editáveis (form state)
  const [title, setTitle] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [discount, setDiscount] = useState("0");

  useEffect(() => {
    if (proposal) {
      setTitle(proposal.title);
      setValidUntil(proposal.valid_until ?? "");
      setInternalNotes(proposal.internal_notes ?? "");
      setDiscount(String(proposal.discount_amount ?? 0));
    }
  }, [proposal]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["proposal", proposalId] });
    if (proposal) {
      qc.invalidateQueries({ queryKey: ["proposals", "lead", proposal.lead_id] });
      qc.invalidateQueries({ queryKey: ["lead", proposal.lead_id] });
    }
    qc.invalidateQueries({ queryKey: ["proposals-overview"] });
  };

  const saveDetails = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          id: proposalId,
          title: title.trim(),
          valid_until: validUntil || null,
          internal_notes: internalNotes || null,
          discount_amount: Number(discount) || 0,
        },
      }),
    onSuccess: () => {
      toast.success("Proposta atualizada.");
      invalidate();
    },
    onError: (err: Error) =>
      toast.error("Erro ao salvar.", { description: err.message }),
  });

  const changeStatus = useMutation({
    mutationFn: (s: ProposalStatus) =>
      statusFn({ data: { id: proposalId, status: s } }),
    onSuccess: (_r, s) => {
      toast.success(`Status alterado para "${PROPOSAL_STATUS_LABEL[s]}".`);
      invalidate();
    },
    onError: (err: Error) =>
      toast.error("Erro ao alterar status.", { description: err.message }),
  });

  const addItem = useMutation({
    mutationFn: (payload: {
      service_key: string | null;
      service_label: string;
      description: string | null;
      quantity: number;
      unit_price: number;
    }) => addItemFn({ data: { proposal_id: proposalId, ...payload } }),
    onSuccess: () => invalidate(),
    onError: (err: Error) => toast.error("Erro ao adicionar item.", { description: err.message }),
  });

  const updItem = useMutation({
    mutationFn: (payload: {
      id: string;
      service_label?: string;
      description?: string | null;
      quantity?: number;
      unit_price?: number;
    }) => updItemFn({ data: payload }),
    onSuccess: () => invalidate(),
    onError: (err: Error) => toast.error("Erro ao atualizar item.", { description: err.message }),
  });

  const rmItem = useMutation({
    mutationFn: (id: string) => rmItemFn({ data: { id } }),
    onSuccess: () => invalidate(),
    onError: (err: Error) => toast.error("Erro ao remover item.", { description: err.message }),
  });

  const groups = useMemo(() => groupServiceLibrary(), []);

  const totals = useMemo(() => {
    const total = items.reduce((acc, it) => acc + (it.subtotal ?? 0), 0);
    const desc = Number(discount) || 0;
    return { total, desc, final: Math.max(0, total - desc) };
  }, [items, discount]);

  const canEdit = canWrite && proposal && proposal.status !== "aprovada";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col" data-testid="proposal-drawer">
        {!proposal ? (
          <div className="flex items-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando proposta…
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <DialogTitle className="text-lg">
                    {proposal.number}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    {proposal.title}
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      PROPOSAL_STATUS_TONE[proposal.status],
                    )}
                    data-testid="proposal-status-badge"
                  >
                    {PROPOSAL_STATUS_LABEL[proposal.status]}
                  </span>
                  {canWrite && (
                    <Select
                      value={proposal.status}
                      onValueChange={(v) => changeStatus.mutate(v as ProposalStatus)}
                      disabled={changeStatus.isPending}
                    >
                      <SelectTrigger className="h-9 w-[190px]">
                        <SelectValue placeholder="Alterar status" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROPOSAL_STATUS_ORDER.map((s) => (
                          <SelectItem key={s} value={s}>
                            {PROPOSAL_STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto">
              <Tabs defaultValue="items" className="w-full">
                <TabsList>
                  <TabsTrigger value="items">Itens</TabsTrigger>
                  <TabsTrigger value="negotiation">Negociação</TabsTrigger>
                  <TabsTrigger value="details">Detalhes</TabsTrigger>
                </TabsList>

                {/* ITENS */}
                <TabsContent value="items" className="space-y-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      {items.length} {items.length === 1 ? "item" : "itens"}
                    </p>
                    {canEdit && (
                      <ServiceLibraryPopover
                        groups={groups}
                        onPick={(item) =>
                          addItem.mutate({
                            service_key: item.key,
                            service_label: item.label,
                            description: item.defaultDescription ?? null,
                            quantity: 1,
                            unit_price: item.defaultUnitPrice ?? 0,
                          })
                        }
                        onCustom={() =>
                          addItem.mutate({
                            service_key: null,
                            service_label: "Novo item",
                            description: null,
                            quantity: 1,
                            unit_price: 0,
                          })
                        }
                      />
                    )}
                  </div>

                  {items.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      Nenhum item na proposta. Adicione um item da biblioteca de serviços.
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium">Serviço</th>
                            <th className="text-right px-3 py-2 font-medium w-24">Qtd</th>
                            <th className="text-right px-3 py-2 font-medium w-36">Unitário</th>
                            <th className="text-right px-3 py-2 font-medium w-36">Subtotal</th>
                            {canEdit && <th className="w-10" />}
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((it) => (
                            <tr key={it.id} className="border-t border-border align-top" data-testid="proposal-item-row">
                              <td className="px-3 py-2">
                                <Input
                                  value={it.service_label}
                                  onChange={(e) =>
                                    updItem.mutate({ id: it.id, service_label: e.target.value })
                                  }
                                  onBlur={(e) => {
                                    if (e.target.value.trim() !== it.service_label) {
                                      updItem.mutate({
                                        id: it.id,
                                        service_label: e.target.value.trim() || "Item",
                                      });
                                    }
                                  }}
                                  disabled={!canEdit}
                                  className="h-8"
                                />
                                <Textarea
                                  value={it.description ?? ""}
                                  onChange={(e) =>
                                    updItem.mutate({ id: it.id, description: e.target.value })
                                  }
                                  disabled={!canEdit}
                                  rows={1}
                                  className="mt-1 min-h-[32px] text-xs"
                                  placeholder="Descrição (opcional)"
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <Input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={it.quantity}
                                  onChange={(e) =>
                                    updItem.mutate({
                                      id: it.id,
                                      quantity: Math.max(0.01, Number(e.target.value) || 1),
                                    })
                                  }
                                  disabled={!canEdit}
                                  className="h-8 text-right"
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={it.unit_price}
                                  onChange={(e) =>
                                    updItem.mutate({
                                      id: it.id,
                                      unit_price: Math.max(0, Number(e.target.value) || 0),
                                    })
                                  }
                                  disabled={!canEdit}
                                  className="h-8 text-right"
                                />
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                {fmtBRL(it.subtotal)}
                              </td>
                              {canEdit && (
                                <td className="px-2 py-2 text-right">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => rmItem.mutate(it.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="rounded-lg bg-muted/30 border border-border p-4 space-y-2">
                    <TotalsRow label="Subtotal" value={fmtBRL(totals.total)} testId="proposal-subtotal" />
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm text-muted-foreground" htmlFor="proposal-discount">Desconto</label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="proposal-discount"
                          data-testid="proposal-discount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value)}
                          onBlur={() => saveDetails.mutate()}
                          disabled={!canEdit}
                          className="h-8 w-32 text-right"
                        />
                      </div>
                    </div>
                    <TotalsRow
                      label="Valor final"
                      value={fmtBRL(totals.final)}
                      emphasis
                      testId="proposal-final"
                    />
                  </div>
                </TabsContent>

                {/* NEGOCIAÇÃO */}
                <TabsContent value="negotiation" className="space-y-3 py-3">
                  <NegotiationForm
                    disabled={!canEdit}
                    onSubmit={(type, content) =>
                      addNegFn({ data: { proposal_id: proposalId, type, content } })
                        .then(() => {
                          toast.success("Registro adicionado.");
                          invalidate();
                        })
                        .catch((e) =>
                          toast.error("Erro ao registrar.", { description: e.message }),
                        )
                    }
                  />
                  {negotiations.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      Nenhum registro de negociação ainda.
                    </div>
                  ) : (
                    <ol className="space-y-2">
                      {negotiations.map((n) => (
                        <li key={n.id} className="rounded-lg border border-border bg-card p-3">
                          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
                              {NEGOTIATION_TYPE_LABEL[n.type]}
                            </span>
                            <span>
                              {n.created_by_name ?? "—"} ·{" "}
                              {new Date(n.created_at).toLocaleString("pt-BR", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="mt-2 text-sm whitespace-pre-wrap leading-relaxed">
                            {n.content}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                </TabsContent>

                {/* DETALHES */}
                <TabsContent value="details" className="space-y-3 py-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="d-title">Título</Label>
                      <Input
                        id="d-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Emitida em</Label>
                      <Input
                        value={new Date(proposal.issued_at).toLocaleDateString("pt-BR")}
                        disabled
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="d-valid">Válida até</Label>
                      <Input
                        id="d-valid"
                        type="date"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="d-notes">Observações internas</Label>
                      <Textarea
                        id="d-notes"
                        value={internalNotes}
                        onChange={(e) => setInternalNotes(e.target.value)}
                        disabled={!canEdit}
                        rows={4}
                        placeholder="Notas visíveis apenas para o time comercial."
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter className="pt-3 border-t">
              <div className="flex-1 text-sm text-muted-foreground">
                Total:{" "}
                <span className="font-semibold text-foreground">
                  {fmtBRL(totals.final)}
                </span>
              </div>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              {canEdit && (
                <Button
                  onClick={() => saveDetails.mutate()}
                  disabled={saveDetails.isPending}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saveDetails.isPending ? "Salvando…" : "Salvar detalhes"}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TotalsRow({
  label,
  value,
  emphasis,
  testId,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  testId?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={cn("text-muted-foreground", emphasis && "text-foreground font-semibold")}>
        {label}
      </span>
      <span
        data-testid={testId}
        className={cn("font-medium", emphasis && "text-lg font-semibold")}
      >
        {value}
      </span>
    </div>
  );
}

interface ServiceLibraryPopoverProps {
  groups: Record<ServiceCategory, typeof SERVICE_LIBRARY>;
  onPick: (item: (typeof SERVICE_LIBRARY)[number]) => void;
  onCustom: () => void;
}

function ServiceLibraryPopover({ groups, onPick, onCustom }: ServiceLibraryPopoverProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar da biblioteca
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-2">
        <div className="max-h-80 overflow-y-auto space-y-3">
          {(Object.keys(groups) as ServiceCategory[]).map((cat) => (
            <div key={cat}>
              <div className="px-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {CATEGORY_LABEL[cat]}
              </div>
              <ul className="space-y-1">
                {groups[cat].map((item) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => {
                        onPick(item);
                        setOpen(false);
                      }}
                      className="w-full text-left rounded-md px-2 py-1.5 hover:bg-muted transition-colors"
                    >
                      <div className="text-sm text-foreground font-medium">{item.label}</div>
                      {item.defaultDescription && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {item.defaultDescription}
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-2 mt-2 border-t">
          <Button
            size="sm"
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => {
              onCustom();
              setOpen(false);
            }}
          >
            <Plus className="h-4 w-4" /> Adicionar item personalizado
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NegotiationForm({
  disabled,
  onSubmit,
}: {
  disabled: boolean;
  onSubmit: (type: ProposalNegotiationType, content: string) => void;
}) {
  const [type, setType] = useState<ProposalNegotiationType>("observacao");
  const [content, setContent] = useState("");
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Tipo</Label>
        <Select value={type} onValueChange={(v) => setType(v as ProposalNegotiationType)}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(NEGOTIATION_TYPE_LABEL) as ProposalNegotiationType[]).map((k) => (
              <SelectItem key={k} value={k}>
                {NEGOTIATION_TYPE_LABEL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Textarea
        placeholder="Descreva a contraproposta, desconto ou observação…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={disabled}
        rows={3}
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={disabled || !content.trim()}
          onClick={() => {
            onSubmit(type, content.trim());
            setContent("");
          }}
          className="gap-2"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Registrar
        </Button>
      </div>
    </div>
  );
}
