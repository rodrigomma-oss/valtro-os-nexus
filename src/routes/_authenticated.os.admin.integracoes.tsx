/**
 * Sprint 14.1 — UI administrativa da integração com o Google Calendar.
 *
 * Acesso restrito a administradores (validado no servidor). A tela expõe
 * apenas metadados: nunca tokens, client id/secret ou payloads do Google.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, redirect, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Link2,
  Link2Off,
  Loader2,
  RefreshCcw,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { CalendarAutoSyncPanel } from "@/components/app/calendar-auto-sync-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  disconnectGoogleCalendar,
  getCalendarIntegrationStatus,
  listGoogleCalendars,
  retryCalendarSyncFailures,
  runCalendarSync,
  selectGoogleCalendar,
  startGoogleCalendarConnect,
} from "@/lib/calendar-integration.functions";
import { getMyRoles } from "@/lib/leads.functions";

const CALLBACK_MESSAGES: Record<string, { tone: "ok" | "warn" | "error"; text: string }> = {
  conectado: { tone: "ok", text: "Conta Google conectada e agenda selecionada." },
  sem_agenda: {
    tone: "warn",
    text: 'Conta conectada, mas a agenda "Valtro Labs — CRM" não foi encontrada. Selecione a agenda abaixo.',
  },
  negado: { tone: "error", text: "Autorização negada no Google." },
  invalido: { tone: "error", text: "Retorno do Google incompleto. Tente conectar novamente." },
  state_invalido: { tone: "error", text: "Assinatura de segurança inválida no retorno." },
  state_expirado: { tone: "error", text: "O pedido de conexão expirou. Tente novamente." },
  falha: { tone: "error", text: "Não foi possível concluir a conexão com o Google." },
};

export const Route = createFileRoute("/_authenticated/os/admin/integracoes")({
  beforeLoad: async ({ context }) => {
    const isAdmin = (context as any).isAdmin;
    if (!isAdmin) {
      throw redirect({ to: "/os" });
    }
  },
  component: IntegracoesPage,
  validateSearch: (search: Record<string, unknown>) => ({
    google: typeof search.google === "string" ? search.google : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Integrações — CRM Valtro Labs" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    conectado: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    erro: "border-destructive/20 bg-destructive/10 text-destructive",
    desconectado: "border-border bg-muted text-muted-foreground",
    nunca_conectado: "border-border bg-muted text-muted-foreground",
  };
  const labels: Record<string, string> = {
    conectado: "Conectado",
    erro: "Erro",
    desconectado: "Desconectado",
    nunca_conectado: "Nunca conectado",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        map[status] ?? map.desconectado,
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}

function IntegracoesPage() {
  const qc = useQueryClient();
  const search = useSearch({ from: "/_authenticated/os/admin/integracoes" });
  const { isAdmin } = Route.useRouteContext();

  const statusFn = useServerFn(getCalendarIntegrationStatus);
  const connectFn = useServerFn(startGoogleCalendarConnect);
  const disconnectFn = useServerFn(disconnectGoogleCalendar);
  const calendarsFn = useServerFn(listGoogleCalendars);
  const selectFn = useServerFn(selectGoogleCalendar);
  const retryFn = useServerFn(retryCalendarSyncFailures);
  const syncFn = useServerFn(runCalendarSync);

  const [showCalendars, setShowCalendars] = useState(false);

  const statusQuery = useQuery({
    queryKey: ["calendar-integration"],
    queryFn: () => statusFn(),
    refetchInterval: 30_000,
    retry: false,
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!search.google) return;
    const msg = CALLBACK_MESSAGES[search.google];
    if (!msg) return;
    if (msg.tone === "ok") toast.success(msg.text);
    else if (msg.tone === "warn") toast.warning(msg.text);
    else toast.error(msg.text);
    if (search.google === "sem_agenda") setShowCalendars(true);
  }, [search.google]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["calendar-integration"] });

  const connectMut = useMutation({
    mutationFn: () => connectFn(),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (e: Error) => toast.error("Não foi possível iniciar a conexão.", { description: e.message }),
  });

  const disconnectMut = useMutation({
    mutationFn: () => disconnectFn(),
    onSuccess: () => {
      toast.success("Integração desconectada. Os follow-ups do CRM permanecem intactos.");
      setShowCalendars(false);
      refresh();
    },
    onError: (e: Error) => toast.error("Falha ao desconectar.", { description: e.message }),
  });

  const calendarsQuery = useQuery({
    queryKey: ["calendar-integration", "calendars"],
    queryFn: () => calendarsFn(),
    enabled: showCalendars,
  });

  const selectMut = useMutation({
    mutationFn: (v: { calendar_id: string; summary: string }) => selectFn({ data: v }),
    onSuccess: () => {
      toast.success("Agenda selecionada. Os follow-ups serão reprojetados.");
      setShowCalendars(false);
      refresh();
    },
    onError: (e: Error) => toast.error("Falha ao selecionar agenda.", { description: e.message }),
  });

  const syncMut = useMutation({
    mutationFn: () => syncFn(),
    onSuccess: (r) => {
      if (r.skipped) toast.warning(r.skipped);
      else
        toast.success(
          `Fila processada: ${r.synced} sincronizado(s), ${r.removed} removido(s), ${r.failed} com falha.`,
        );
      refresh();
    },
    onError: (e: Error) => toast.error("Falha ao sincronizar.", { description: e.message }),
  });

  const retryMut = useMutation({
    mutationFn: (linkId?: string) => retryFn({ data: linkId ? { link_id: linkId } : {} }),
    onSuccess: async ({ requeued }) => {
      toast.success(`${requeued} item(ns) reenfileirado(s).`);
      await syncMut.mutateAsync();
    },
    onError: (e: Error) => toast.error("Falha ao reprocessar.", { description: e.message }),
  });

  const data = statusQuery.data;
  const busy = connectMut.isPending || disconnectMut.isPending || syncMut.isPending;

  const queueEntries = useMemo(
    () =>
      data
        ? ([
            ["Pendentes", data.queue.pendente],
            ["Sincronizados", data.queue.sincronizado],
            ["Falhas", data.queue.falha],
            ["Removidos", data.queue.removido],
          ] as const)
        : [],
    [data],
  );

  return (
    <div className="p-6 md:p-10 space-y-6">
      <PageHeader
        title="Integrações"
        description="Conexões externas do CRM. O CRM continua sendo a fonte de verdade — a agenda é apenas uma projeção."
      />

      {!isAdmin ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Acesso restrito a administradores.</span>
          </div>
        </div>
      ) : null}

      {statusQuery.isError ? (
        <Card className="shadow-soft border-destructive/30">
          <CardContent className="p-6 text-sm text-destructive">
            {(statusQuery.error as Error).message}
          </CardContent>
        </Card>
      ) : null}

      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" strokeWidth={1.75} />
              Google Calendar — agenda da empresa
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Agenda operacional alvo:{" "}
              <span className="font-medium text-foreground">
                {data?.target_calendar ?? "Valtro Labs — CRM"}
              </span>
            </p>
          </div>
          {data ? <StatusPill status={data.status} /> : null}
        </CardHeader>

        <CardContent className="space-y-5">
          {statusQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando status…
            </div>
          ) : data ? (
            <>
              <dl className="grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Conta</dt>
                  <dd className="mt-1 text-sm text-foreground">{data.account_email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Agenda</dt>
                  <dd className="mt-1 text-sm text-foreground">{data.calendar_summary ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Conectado em
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {data.connected_at
                      ? new Date(data.connected_at).toLocaleString("pt-BR")
                      : "—"}
                  </dd>
                </div>
              </dl>

              {data.last_error ? (
                <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{data.last_error}</span>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {data.connected ? (
                  <>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => setShowCalendars((v) => !v)}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {showCalendars ? "Ocultar agendas" : "Selecionar agenda"}
                    </Button>
                    <Button variant="outline" disabled={busy} onClick={() => syncMut.mutate()}>
                      {syncMut.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCcw className="mr-2 h-4 w-4" />
                      )}
                      Sincronizar agora
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={busy}
                      onClick={() => disconnectMut.mutate()}
                    >
                      <Link2Off className="mr-2 h-4 w-4" />
                      Desconectar
                    </Button>
                  </>
                ) : (
                  <Button disabled={busy} onClick={() => connectMut.mutate()}>
                    {connectMut.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="mr-2 h-4 w-4" />
                    )}
                    Conectar conta Google
                  </Button>
                )}
              </div>

              {showCalendars ? (
                <div className="rounded-md border border-border p-3">
                  {calendarsQuery.isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Buscando agendas…
                    </div>
                  ) : calendarsQuery.isError ? (
                    <p className="text-sm text-destructive">
                      {(calendarsQuery.error as Error).message}
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {(calendarsQuery.data ?? []).map((c) => (
                        <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                          <span className="truncate text-sm text-foreground">{c.summary}</span>
                          {c.selected ? (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Em uso
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={selectMut.isPending}
                              onClick={() =>
                                selectMut.mutate({ calendar_id: c.id, summary: c.summary })
                              }
                            >
                              Usar esta
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}

              <Separator />

              <CalendarAutoSyncPanel status={data} />

              <Separator />

              <div>

                <h3 className="text-sm font-semibold text-foreground">Fila de sincronização</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {queueEntries.map(([label, value]) => (
                    <div key={label} className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
                    </div>
                  ))}
                </div>

                {data.failures.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">Falhas recentes</p>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={retryMut.isPending}
                        onClick={() => retryMut.mutate(undefined)}
                      >
                        {retryMut.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCcw className="mr-2 h-4 w-4" />
                        )}
                        Reprocessar todas
                      </Button>
                    </div>
                    <ul className="space-y-2">
                      {data.failures.map((f) => (
                        <li
                          key={f.id}
                          className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs text-muted-foreground">
                              follow-up {f.entity_id}
                            </p>
                            <p className="mt-1 break-words text-sm text-foreground">
                              {f.last_error ?? "Erro desconhecido"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {f.sync_attempts} tentativa(s)
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={retryMut.isPending}
                            onClick={() => retryMut.mutate(f.id)}
                          >
                            Tentar de novo
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
