import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { FolderKanban, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ProjectStatusBadge } from "./project-status-badge";
import { NewProjectDialog } from "./new-project-dialog";
import { listProjectsByClient } from "@/lib/projects.functions";
import type { Project } from "@/types/project";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function ProjectsCard({
  clientId,
  canWrite,
}: {
  clientId: string;
  canWrite: boolean;
}) {
  const qc = useQueryClient();
  const listFn = useServerFn(listProjectsByClient);
  const [newOpen, setNewOpen] = useState(false);

  const projectsQuery = useQuery({
    queryKey: ["projects", "client", clientId],
    queryFn: () => listFn({ data: { client_id: clientId } }),
  });

  const projects = useMemo<Project[]>(() => projectsQuery.data ?? [], [projectsQuery.data]);

  return (
    <>
      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-primary" strokeWidth={1.75} /> Projetos
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Projetos vinculados a este cliente.
            </p>
          </div>
          {canWrite && projects.length > 0 && (
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" strokeWidth={1.75} /> Novo projeto
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {projectsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando projetos…
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="Nenhum projeto ainda"
              description={
                canWrite
                  ? "Registre o primeiro projeto para este cliente."
                  : "Ainda não há projetos vinculados."
              }
              action={
                canWrite ? (
                  <Button className="gap-2" onClick={() => setNewOpen(true)}>
                    <Plus className="h-4 w-4" strokeWidth={1.75} /> Novo projeto
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="space-y-2">
              {projects.map((p) => (
                <li key={p.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <Link
                      to="/os/comercial/projetos/$id"
                      params={{ id: p.id }}
                      className="flex-1 min-w-0 text-left group"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground truncate group-hover:text-primary">
                          {p.code} · {p.name}
                        </span>
                        <ProjectStatusBadge status={p.status} />
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {p.owner_name && <span>{p.owner_name}</span>}
                        {p.start_date && <span>· Início {fmtDate(p.start_date)}</span>}
                        {p.due_date && <span>· Prazo {fmtDate(p.due_date)}</span>}
                        {p.proposal_number && <span>· Proposta {p.proposal_number}</span>}
                      </div>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <NewProjectDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        clientId={clientId}
        onCreated={() => qc.invalidateQueries({ queryKey: ["projects", "client", clientId] })}
      />
    </>
  );
}
