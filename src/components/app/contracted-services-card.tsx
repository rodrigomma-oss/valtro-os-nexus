/**
 * ContractedServicesCard — Sprint 13.3.
 * Lista as contratações (client_services) de um cliente, sempre a partir
 * dos snapshots persistidos na conversão da proposta.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, PackageCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { listClientServices } from "@/lib/client-services.functions";
import {
  BILLING_INTERVAL_LABEL,
  BILLING_TYPE_LABEL,
  CLIENT_SERVICE_STATUS_LABEL,
  CLIENT_SERVICE_STATUS_TONE,
  scopeKeyLabel,
  type ClientService,
} from "@/types/client-service";

interface ContractedServicesCardProps {
  clientId: string;
}

function fmtCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ContractedServicesCard({ clientId }: ContractedServicesCardProps) {
  const listFn = useServerFn(listClientServices);
  const query = useQuery({
    queryKey: ["client-services", clientId],
    queryFn: () => listFn({ data: { client_id: clientId } }),
  });

  const services = query.data ?? [];
  const summary = useMemo(() => {
    const recurring = services.filter((s) => s.billing_type_snapshot === "recorrente");
    return {
      count: services.length,
      active: services.filter((s) => s.status === "ativo").length,
      mrr: recurring
        .filter((s) => s.status === "ativo" || s.status === "pendente")
        .reduce((acc, s) => acc + s.contracted_amount_cents, 0),
    };
  }, [services]);

  return (
    <Card className="shadow-soft" data-testid="contracted-services-card">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Serviços contratados</CardTitle>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Contratações geradas a partir de propostas aprovadas. Os valores são o retrato
          comercial do momento da contratação.
        </p>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {services.length > 0 && (
          <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-muted/30 p-3 text-xs">
            <Stat label="Contratações" value={String(summary.count)} />
            <Stat label="Ativas" value={String(summary.active)} />
            <Stat label="Recorrente mensal" value={fmtCents(summary.mrr)} />
          </div>
        )}

        {query.isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando contratações…
          </div>
        ) : services.length === 0 ? (
          <EmptyState
            icon={PackageCheck}
            title="Nenhum serviço contratado."
            description="Gere as contratações a partir de uma proposta aprovada deste cliente."
          />
        ) : (
          <ul className="space-y-2">
            {services.map((s) => (
              <ContractRow key={s.id} service={s} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function ContractRow({ service: s }: { service: ClientService }) {
  const scopeEntries = Object.entries(s.scope_snapshot);
  return (
    <li className="rounded-xl border border-border bg-card p-3" data-testid="contracted-service-row">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">{s.name_snapshot}</span>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                CLIENT_SERVICE_STATUS_TONE[s.status],
              )}
            >
              {CLIENT_SERVICE_STATUS_LABEL[s.status]}
            </span>
            {!s.service_id && (
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                Customizado
              </span>
            )}
          </div>
          {s.description_snapshot && (
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {s.description_snapshot}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>
              {BILLING_TYPE_LABEL[s.billing_type_snapshot]}
              {s.billing_interval_snapshot
                ? ` · ${BILLING_INTERVAL_LABEL[s.billing_interval_snapshot]}`
                : ""}
            </span>
            <span>· Contratado em {fmtDate(s.contracted_at)}</span>
            {s.proposal_number && <span>· Origem {s.proposal_number}</span>}
            {scopeEntries.map(([k, v]) => (
              <span key={k}>
                · {scopeKeyLabel(k)}: {String(v)}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-foreground">
            {fmtCents(s.contracted_amount_cents)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {s.quantity} × {fmtCents(s.unit_price_cents)}
          </div>
        </div>
      </div>
    </li>
  );
}
