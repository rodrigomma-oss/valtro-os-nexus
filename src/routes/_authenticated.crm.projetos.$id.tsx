import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Loader2,
  FolderKanban,
  Sparkles,
  RefreshCcw,
  UserCog,
  CalendarCheck,
  Ban,
  FileText,
  MessageCircle,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectStatusBadge } from "@/components/app/project-status-badge";
import { TimelineCard, type TimelineItem } from "@/components/app/timeline-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getProject, updateProject } from "@/lib/projects.functions";
import { getMyRoles } from "@/lib/leads.functions";
import type { ProjectEvent, ProjectEventType, ProjectStatus } from "@/types/project";
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_ORDER } from "@/types/project";

export const Route = createFileRoute("/_authenticated/crm/projetos/$id")({
  component: ProjectDetail,
  head: () => ({
    meta: [
      { title: "Projeto — CRM Valtro Labs" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const EVENT_META: Record<ProjectEventType, { icon: typeof Sparkles; tone: TimelineItem["tone"]; title: string }> = {
  projeto_criado: { icon: Sparkles, tone: "default", title: "Projeto criado" },
  status_alterado: { icon: RefreshCcw, tone: "warning", title: "Status alterado" },
  responsavel_alterado: { icon: UserCog, tone: "default", title: "Responsável alterado" },
  prazo_alterado: { icon: CalendarCheck, tone: "default", title: "Prazo alterado" },
  projeto_concluido: { icon: CalendarCheck, tone: "success", title: "Projeto concluído" },
  projeto_cancelado: { icon: Ban, tone: "muted", title: "Projeto cancelado" },
  proposta_vinculada: { icon: FileText, tone: "default", title: "Proposta vinculada" },
  observacao_adicionada: { icon: MessageCircle, tone: "default", title: "Observação adicionada" },
  projeto_atualizado: { icon: Pencil, tone: "default", title: "Projeto atualizado" },
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ProjectDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getProject);
  const updateFn = useServerFn(updateProject);
  const rolesFn = useServerFn(getMyRoles);

  const projectQuery = useQuery({
    queryKey: ["project", id],
    queryFn: () => getFn({ data: { id } }),
  });
  const rolesQuery = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => rolesFn(),
    staleTime: 60_000,
  });

  const canWrite = rolesQuery.data?.canWrite ?? false;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["project", id] });
    qc.invalidateQueries({ queryKey: ["projects"] });
    qc.invalidateQueries({ queryKey: ["projects-overview"] });
  };

  const statusMutation = useMutation({
    mutationFn: (status: ProjectStatus) => updateFn({ data: { id, status } }),
    onSuccess: () => {
      toast.success("Status atualizado.");
      invalidate();
    },
    onError: (err: Error) =>
      toast.error("Não foi possível atualizar o status.", { description: err.message }),
  });

  const timeline: TimelineItem[] = useMemo(() => {
    const evs = projectQuery.data?.events ?? [];
    return evs.map((e: ProjectEvent) => {
      const meta = EVENT_META[e.type] ?? EVENT_META.projeto_atualizado;
      const author = e.created_by_name ? ` · ${e.created_by_name}` : "";
      return {
        id: e.id,
        icon: meta.icon,
        title: meta.title,
        description: (e.description ?? "") + author,
        date: fmtDateTime(e.created_at),
        tone: meta.tone,
      };
    });
  }, [projectQuery.data]);

  if (projectQuery.isLoading) {
    return (
      <div className="p-10 flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando projeto…
      </div>
    );
  }
  const payload = projectQuery.data;
  if (!payload) throw notFound();
  const { project } = payload;

  return (
    <div className="p-6 md:p-10 space-y-6">
      <PageHeader
        title={`${project.code} · ${project.name}`}
        description={project.client_name ? `Cliente: ${project.client_name}` : "Projeto"}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/crm/projetos">
                <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.75} />
                Voltar
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Status
              </span>
              <Select
                value={project.status}
                onValueChange={(v) => statusMutation.mutate(v as ProjectStatus)}
                disabled={!canWrite || statusMutation.isPending}
              >
                <SelectTrigger className="w-[210px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PROJECT_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-primary" strokeWidth={1.75} />
                Dados do projeto
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3 text-sm">
              <Row label="Status" value={<ProjectStatusBadge status={project.status} />} />
              <Row
                label="Cliente"
                value={
                  project.client_name ? (
                    <Link
                      to="/crm/clientes/$id"
                      params={{ id: project.client_id }}
                      className="text-primary hover:underline"
                    >
                      {project.client_name}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <Row label="Responsável" value={project.owner_name ?? "—"} />
              <Row label="Início" value={fmtDate(project.start_date)} />
              <Row label="Prazo" value={fmtDate(project.due_date)} />
              <Row label="Conclusão" value={fmtDate(project.completed_at)} />
              <Row
                label="Proposta"
                value={project.proposal_number ?? "—"}
              />
              {project.description && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                    Descrição
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {project.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <TimelineCard title="Linha do tempo do projeto" items={timeline} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border last:border-0">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="text-sm text-foreground text-right">{value}</div>
    </div>
  );
}
