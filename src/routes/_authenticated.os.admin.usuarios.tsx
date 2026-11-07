/**
 * Sprint 15.2.2B — Administração de Usuários.
 *
 * Tela de gestão de usuários internos: listagem, convite, alteração de papel e
 * bloqueio/desbloqueio de acesso. Acesso restrito a administradores (validado
 * no servidor). Inclui trilha de auditoria das ações administrativas.
 *
 * Por requisito da sprint, NÃO existe ação de exclusão de usuários: a remoção de
 * acesso é sempre feita por bloqueio, preservando perfil, papéis e autoria.
 */

import { useMemo, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Shield, Users, UserCog, Eye, Ban, Mail, Plus, Search, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { DataTable, type DataTableColumn } from "@/components/app/data-table";
import { StatCard } from "@/components/app/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { UserInviteDialog } from "@/components/app/user-invite-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  listUsers,
  changeUserRole,
  toggleUserBlock,
  listAuditEvents,
  type AdminUser,
  type AppRole,
  type AuditEvent,
} from "@/lib/admin-users.functions";
import { getMyRoles } from "@/lib/leads.functions";

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  operator: "Operador",
  viewer: "Visualizador",
};

const ROLE_BADGE_CLASS: Record<AppRole, string> = {
  admin: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  operator: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  viewer: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

const ACTION_LABEL: Record<string, string> = {
  invite: "Convite enviado",
  role_change: "Papel alterado",
  block: "Usuário bloqueado",
  unblock: "Usuário desbloqueado",
  resend_invite: "Convite reenviado",
  cancel_invite: "Convite cancelado",
};

export const Route = createFileRoute("/_authenticated/os/admin/usuarios")({
  beforeLoad: async ({ context }) => {
    const isAdmin = (context as any).isAdmin;
    if (!isAdmin) {
      throw redirect({ to: "/os" });
    }
  },
  component: UsersAdminPage,
  head: () => ({
    meta: [
      { title: "Usuários — CRM Valtro Labs" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function UsersAdminPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listUsers);
  const changeRoleFn = useServerFn(changeUserRole);
  const toggleBlockFn = useServerFn(toggleUserBlock);
  const auditFn = useServerFn(listAuditEvents);
  
  const { isAdmin } = Route.useRouteContext();

  const [term, setTerm] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<
    { type: "role"; user: AdminUser; role: AppRole } | { type: "block"; user: AdminUser } | null
  >(null);

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listFn(),
    retry: false,
    enabled: isAdmin,
  });

  const auditQuery = useQuery({
    queryKey: ["admin-audit-events"],
    queryFn: () => auditFn(),
    enabled: isAdmin,
    retry: false,
  });

  const changeRoleMut = useMutation({
    mutationFn: (vars: { user_id: string; role: AppRole }) => changeRoleFn({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-audit-events"] });
      toast.success("Papel atualizado.");
      setConfirmState(null);
    },
    onError: (err: Error) => toast.error(err.message ?? "Não foi possível alterar o papel."),
  });

  const toggleBlockMut = useMutation({
    mutationFn: (user_id: string) => toggleBlockFn({ data: { user_id } }),
    onSuccess: (_res, _id, context) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-audit-events"] });
      toast.success(
        confirmState?.type === "block" && (confirmState.user as AdminUser).banned
          ? "Usuário desbloqueado."
          : "Usuário bloqueado.",
      );
      setConfirmState(null);
    },
    onError: (err: Error) => toast.error(err.message ?? "Não foi possível alterar o bloqueio."),
  });

  const q = term.trim().toLowerCase();

  const { filtered, summary } = useMemo(() => {
    const data = usersQuery.data ?? [];
    const filtered =
      q.length === 0
        ? data
        : data.filter(
            (u) =>
              u.email.toLowerCase().includes(q) ||
              (u.full_name ?? "").toLowerCase().includes(q) ||
              u.role_label.toLowerCase().includes(q),
          );
    const total = data.length;
    const admins = data.filter((u) => u.roles.includes("admin")).length;
    const operators = data.filter((u) => u.roles.includes("operator")).length;
    const viewers = data.filter((u) => u.roles.includes("viewer")).length;
    const blocked = data.filter((u) => u.banned).length;
    return { filtered, summary: { total, admins, operators, viewers, blocked } };
  }, [usersQuery.data, q]);

  const columns: DataTableColumn<AdminUser>[] = [
    {
      key: "user",
      header: "Usuário",
      className: "min-w-[220px]",
      render: (u) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{u.full_name ?? "Sem nome"}</p>
          <p className="text-xs text-muted-foreground">{u.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Papel",
      render: (u) => (
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
            u.roles.length > 0
              ? ROLE_BADGE_CLASS[u.roles[0] ?? "viewer"]
              : "border-border bg-muted text-muted-foreground",
          )}
        >
          {u.role_label}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (u) => (
        <Badge
          variant={u.banned ? "destructive" : "secondary"}
          className={cn(
            "font-medium",
            !u.banned &&
              "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400",
          )}
        >
          {u.banned ? "Bloqueado" : "Ativo"}
        </Badge>
      ),
    },
    {
      key: "last_sign_in",
      header: "Último acesso",
      render: (u) => (
        <p className="text-sm text-muted-foreground">
          {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("pt-BR") : "Nunca"}
        </p>
      ),
    },
    {
      key: "actions",
      header: "Ações",
      className: "text-right",
      render: (u) => {
        if (!isAdmin) return null;
        return (

          <div className="flex items-center justify-end gap-2">
            <Select
              value={u.roles[0] ?? "viewer"}
              onValueChange={(v) => setConfirmState({ type: "role", user: u, role: v as AppRole })}
              disabled={u.banned}
            >
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{ROLE_LABEL.admin}</SelectItem>
                <SelectItem value="operator">{ROLE_LABEL.operator}</SelectItem>
                <SelectItem value="viewer">{ROLE_LABEL.viewer}</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="icon"
              variant={u.banned ? "outline" : "ghost"}
              className={cn("h-8 w-8", u.banned && "text-emerald-600 hover:text-emerald-700")}
              title={u.banned ? "Desbloquear" : "Bloquear"}
              onClick={() => setConfirmState({ type: "block", user: u })}
            >
              <Ban className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 md:p-10 space-y-6">
      <PageHeader
        title="Usuários"
        description="Gerencie usuários internos, papéis e acompanhe as ações administrativas."
      />

      {!isAdmin ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Acesso restrito a administradores.</span>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total" value={summary.total} icon={Users} />
        <StatCard label="Administradores" value={summary.admins} icon={Shield} />
        <StatCard label="Operadores" value={summary.operators} icon={UserCog} />
        <StatCard label="Visualizadores" value={summary.viewers} icon={Eye} />
        <StatCard label="Bloqueados" value={summary.blocked} icon={Ban} />
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail…"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            {isAdmin ? (
              <Button onClick={() => setInviteOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Convidar usuário
              </Button>
            ) : null}

          </div>

          <DataTable
            columns={columns}
            data={filtered}
            loading={usersQuery.isLoading}
            emptyState={
              <EmptyState
                icon={Users}
                title="Nenhum usuário encontrado"
                description={
                  q.length > 0
                    ? "Tente ajustar os termos da busca."
                    : "Convide o primeiro colaborador para começar."
                }
              />
            }
          />
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <AuditTable events={auditQuery.data ?? []} loading={auditQuery.isLoading} />
        </TabsContent>
      </Tabs>

      <UserInviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      <ConfirmDialog
        state={confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={() => {
          if (!confirmState) return;
          if (confirmState.type === "role") {
            changeRoleMut.mutate({
              user_id: confirmState.user.id,
              role: confirmState.role,
            });
          } else if (confirmState.type === "block") {
            toggleBlockMut.mutate(confirmState.user.id);
          }
        }}
        busy={changeRoleMut.isPending || toggleBlockMut.isPending}
      />
    </div>
  );
}

function AuditTable({ events, loading }: { events: AuditEvent[]; loading: boolean }) {
  const columns: DataTableColumn<AuditEvent>[] = [
    {
      key: "when",
      header: "Quando",
      render: (e) => (
        <p className="text-sm text-muted-foreground">
          {new Date(e.created_at).toLocaleString("pt-BR")}
        </p>
      ),
    },
    {
      key: "action",
      header: "Ação",
      render: (e) => (
        <Badge variant="outline" className="font-medium">
          {ACTION_LABEL[e.action] ?? e.action}
        </Badge>
      ),
    },
    {
      key: "actor",
      header: "Administrador",
      render: (e) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{e.actor_name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{e.actor_email}</p>
        </div>
      ),
    },
    {
      key: "target",
      header: "Alvo",
      render: (e) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{e.target_name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{e.target_email}</p>
        </div>
      ),
    },
    {
      key: "details",
      header: "Detalhes",
      render: (e) => (
        <p className="text-sm text-muted-foreground">
          {e.metadata && Object.keys(e.metadata).length > 0 ? JSON.stringify(e.metadata) : "—"}
        </p>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={events}
      loading={loading}
      emptyState={
        <EmptyState
          icon={Mail}
          title="Nenhum evento de auditoria"
          description="Ações administrativas aparecerão aqui."
        />
      }
    />
  );
}

function ConfirmDialog({
  state,
  onClose,
  onConfirm,
  busy,
}: {
  state:
    | { type: "role"; user: AdminUser; role: AppRole }
    | { type: "block"; user: AdminUser }
    | null;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  if (!state) return null;

  const title =
    state.type === "role"
      ? "Alterar papel"
      : state.user.banned
        ? "Desbloquear usuário"
        : "Bloquear usuário";

  const description =
    state.type === "role"
      ? `Tem certeza que deseja alterar o papel de "${state.user.full_name ?? state.user.email}" para "${ROLE_LABEL[state.role]}"?`
      : state.user.banned
        ? `O usuário "${state.user.full_name ?? state.user.email}" poderá fazer login novamente. O histórico e a autoria permanecem preservados.`
        : `O usuário "${state.user.full_name ?? state.user.email}" não poderá acessar a plataforma até ser desbloqueado. Nenhum dado é excluído: perfil, papel e autoria continuam íntegros.`;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={busy}>
            {busy ? "Processando…" : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
