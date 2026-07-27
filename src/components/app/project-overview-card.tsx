import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Gauge, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getProjectOverview } from "@/lib/project-operations.functions";
import { displayPaymentStatus } from "@/lib/client-service-cycles";
import {
  BILLING_INTERVAL_LABEL,
  BILLING_TYPE_LABEL,
  CLIENT_SERVICE_STATUS_LABEL,
  CLIENT_SERVICE_STATUS_TONE,
  CYCLE_PAYMENT_STATUS_LABEL,
  CYCLE_PAYMENT_STATUS_TONE,
  CYCLE_STATUS_LABEL,
} from "@/types/client-service";
import { ONBOARDING_STATUS_LABEL, ONBOARDING_STATUS_TONE } from "@/types/onboarding";
import {
  ACCESS_STATUS_LABEL,
  ACCESS_STATUS_TONE,
  WEEKDAY_LABEL,
  contractedProductsLimit,
} from "@/types/project-operations";
import { ProjectOperationsDialog } from "./project-operations-dialog";

function money(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "—";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function date(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function dateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

export function ProjectOverviewCard({
  projectId,
  canWrite,
}: {
  projectId: string;
  canWrite: boolean;
}) {
  const qc = useQueryClient();
  const fn = useServerFn(getProjectOverview);
  const [editOpen, setEditOpen] = useState(false);

  const query = useQuery({
    queryKey: ["project-overview", projectId],
    queryFn: () => fn({ data: { project_id: projectId } }),
  });

  const data = query.data;
  const ops = data?.operations ?? null;
  const contract = data?.contract ?? null;
  const cycle = data?.cycle ?? null;
  const onboarding = data?.onboarding ?? null;

  const productsLimit = contractedProductsLimit(contract?.scope_snapshot);
  const payStatus = cycle ? displayPaymentStatus(cycle) : null;

  const alerts = useMemo(() => {
    const list: string[] = [];
    if (!contract) list.push("Projeto sem contratação vinculada — dados comerciais indisponíveis.");
    if (payStatus === "vencido") list.push("Pagamento do ciclo atual em atraso.");
    else if (payStatus === "pendente") list.push("Pagamento do ciclo atual pendente.");
    if (onboarding && onboarding.status !== "concluido")
      list.push(`Onboarding ${ONBOARDING_STATUS_LABEL[onboarding.status].toLowerCase()}.`);
    if (!ops || ops.operational_access_status !== "ativo")
      list.push("Acesso operacional ainda não está ativo.");
    if (!ops?.current_objective) list.push("Objetivo atual do acompanhamento não definido.");
    return list;
  }, [contract, payStatus, onboarding, ops]);

  if (query.isLoading) {
    return (
      <Card className="shadow-soft">
        <CardContent className="py-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando visão geral…
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" strokeWidth={1.75} /> Visão geral
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Contrato, ciclo e operação — dados lidos das entidades de origem.
            </p>
          </div>
          {canWrite && (
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" strokeWidth={1.75} /> Editar operação
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0 space-y-6">
          {/* Contratação */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contratação
            </h3>
            {contract ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Serviço">{contract.name_snapshot}</Field>
                <Field label="Situação">
                  <Badge variant="outline" className={cn(CLIENT_SERVICE_STATUS_TONE[contract.status])}>
                    {CLIENT_SERVICE_STATUS_LABEL[contract.status]}
                  </Badge>
                </Field>
                <Field label="Valor contratado">
                  {money(contract.contracted_amount_cents)}
                  <span className="text-muted-foreground">
                    {" "}
                    ·{" "}
                    {contract.billing_interval_snapshot
                      ? BILLING_INTERVAL_LABEL[contract.billing_interval_snapshot]
                      : BILLING_TYPE_LABEL[contract.billing_type_snapshot]}
                  </span>
                </Field>
                <Field label="Limite contratado de produtos">
                  {productsLimit === null ? (
                    <span className="text-muted-foreground">Não definido</span>
                  ) : (
                    `${productsLimit} produtos`
                  )}
                </Field>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma contratação vinculada a este projeto.
              </p>
            )}
          </section>

          {/* Ciclo */}
          <section className="space-y-3 pt-4 border-t border-border">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ciclo atual
            </h3>
            {cycle ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Ciclo">
                  #{cycle.sequence} · {CYCLE_STATUS_LABEL[cycle.status]}
                </Field>
                <Field label="Período">
                  {date(cycle.period_start)} — {date(cycle.period_end)}
                </Field>
                <Field label="Financeiro">
                  {payStatus && (
                    <Badge variant="outline" className={cn(CYCLE_PAYMENT_STATUS_TONE[payStatus])}>
                      {CYCLE_PAYMENT_STATUS_LABEL[payStatus]}
                    </Badge>
                  )}
                  <span className="text-muted-foreground"> · venc. {date(cycle.due_date)}</span>
                </Field>
                <Field label="Valor do ciclo">{money(cycle.amount_cents)}</Field>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum ciclo ativo ou previsto.</p>
            )}
          </section>

          {/* Operação */}
          <section className="space-y-3 pt-4 border-t border-border">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Operação
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Acesso operacional">
                <Badge
                  variant="outline"
                  className={cn(
                    ACCESS_STATUS_TONE[ops?.operational_access_status ?? "nao_solicitado"],
                  )}
                >
                  {ACCESS_STATUS_LABEL[ops?.operational_access_status ?? "nao_solicitado"]}
                </Badge>
              </Field>
              <Field label="Orçamento mensal de Ads">{money(ops?.ads_monthly_budget_cents)}</Field>
              <Field label="Limite de investimento sem autorização">
                {money(ops?.ads_autonomy_limit_cents)}
              </Field>
              <Field label="Onboarding">
                {onboarding ? (
                  <Badge variant="outline" className={cn(ONBOARDING_STATUS_TONE[onboarding.status])}>
                    {ONBOARDING_STATUS_LABEL[onboarding.status]}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </Field>
              <Field label="Preferência de reunião">
                {meetingPreference ?? <span className="text-muted-foreground">Não informada</span>}
              </Field>
              <Field label="Próxima reunião">
                {ops?.next_meeting_at ? (
                  dateTime(ops.next_meeting_at)
                ) : (
                  <span className="text-muted-foreground">Não agendada</span>
                )}
              </Field>
              <div className="sm:col-span-2">
                <Field label="Objetivo atual">
                  {ops?.current_objective ? (
                    <span className="whitespace-pre-wrap">{ops.current_objective}</span>
                  ) : (
                    <span className="text-muted-foreground">Não definido</span>
                  )}
                </Field>
              </div>
            </div>
            {(ops?.operational_access_notes || ops?.notes) && (
              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                {ops?.operational_access_notes && (
                  <Field label="Observações do acesso">
                    <span className="whitespace-pre-wrap">{ops.operational_access_notes}</span>
                  </Field>
                )}
                {ops?.notes && (
                  <Field label="Observações">
                    <span className="whitespace-pre-wrap">{ops.notes}</span>
                  </Field>
                )}
              </div>
            )}
          </section>

          {/* Alertas */}
          {alerts.length > 0 && (
            <section className="pt-4 border-t border-border">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" strokeWidth={1.75} /> Alertas
                </p>
                <ul className="mt-2 space-y-1 text-sm text-amber-900">
                  {alerts.map((a) => (
                    <li key={a}>· {a}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </CardContent>
      </Card>

      <ProjectOperationsDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        projectId={projectId}
        operations={ops}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["project-overview", projectId] });
          toast.success("Informações operacionais atualizadas.");
        }}
      />
    </>
  );
}
