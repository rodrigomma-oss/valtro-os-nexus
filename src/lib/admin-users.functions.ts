/**
 * Sprint 15.2.2B — Administração de Usuários.
 *
 * Server functions para gestão de usuários internos. Todas as operações
 * exigem papel "admin" e revalidam a autorização no servidor, ignorando
 * qualquer indicação do cliente. Ações sensíveis usam o service role client
 * carregado dentro do handler (nunca no bundle do browser).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export const APP_ROLE_VALUES: AppRole[] = ["admin", "operator", "viewer"];

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  operator: "Operador",
  viewer: "Visualizador",
};

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  roles: AppRole[];
  role_label: string;
  banned: boolean;
  banned_until: string | null;
  confirmed_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

export interface AuditEvent {
  id: string;
  actor_id: string;
  actor_email: string | null;
  actor_name: string | null;
  target_user_id: string | null;
  target_email: string | null;
  target_name: string | null;
  action: string;
  metadata: Record<string, string | number | boolean | null> | null;
  created_at: string;
}

const roleSchema = z.enum(["admin", "operator", "viewer"] as const);

const changeRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: roleSchema,
});

const userIdSchema = z.object({
  user_id: z.string().uuid(),
});

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  full_name: z.string().trim().min(2).max(120),
  role: roleSchema,
});

function assertIsAdmin(isAdmin: boolean | null) {
  if (!isAdmin) {
    throw new Error("Acesso negado: apenas administradores podem executar esta ação.");
  }
}

async function getIsAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin" as AppRole,
  });
  if (error) throw new Error(error.message);
  return !!data;
}

function mapRoleLabel(roles: AppRole[]) {
  if (roles.includes("admin")) return ROLE_LABEL.admin;
  if (roles.includes("operator")) return ROLE_LABEL.operator;
  return ROLE_LABEL.viewer;
}

async function fetchUserProfileNames(
  supabase: SupabaseClient<Database>,
  userIds: string[],
): Promise<Record<string, string | null>> {
  if (userIds.length === 0) return {};
  const { data, error } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
  if (error) throw new Error(error.message);
  const map: Record<string, string | null> = {};
  for (const row of data ?? []) {
    map[row.id] = row.full_name ?? null;
  }
  return map;
}

// =============================================================
// listUsers
// =============================================================
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUser[]> => {
    const isAdmin = await getIsAdmin(context);
    assertIsAdmin(isAdmin);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const {
      data: { users },
      error,
    } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw new Error(error.message);

    const userIds = (users ?? []).map((u) => u.id);
    const profileNames = await fetchUserProfileNames(context.supabase, userIds);

    const { data: roles, error: rolesErr } = await context.supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds);
    if (rolesErr) throw new Error(rolesErr.message);

    const rolesByUser: Record<string, AppRole[]> = {};
    for (const r of roles ?? []) {
      (rolesByUser[r.user_id] ??= []).push(r.role);
    }

    return (users ?? []).map((u) => {
      const fullName = profileNames[u.id] ?? null;
      const roles = rolesByUser[u.id] ?? [];
      return {
        id: u.id,
        email: u.email ?? "—",
        full_name: fullName ?? u.user_metadata?.full_name ?? u.user_metadata?.name ?? null,
        avatar_url: u.user_metadata?.avatar_url ?? null,
        roles,
        role_label: mapRoleLabel(roles),
        banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
        banned_until: u.banned_until ?? null,
        confirmed_at: u.confirmed_at ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
      };
    });
  });

// =============================================================
// inviteUser
// =============================================================
export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inviteSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ user_id: string }> => {
    const isAdmin = await getIsAdmin(context);
    assertIsAdmin(isAdmin);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      {
        data: {
          full_name: data.full_name,
          role: data.role,
        },
      },
    );

    if (createErr) {
      throw new Error(createErr.message);
    }

    if (!created?.user) {
      throw new Error("O convite foi enviado, mas não foi possível confirmar o usuário.");
    }

    // O trigger handle_new_user já criará o perfil e o papel a partir dos metadados.
    // Forçamos o upsert do nome aqui para garantir imediatez, mesmo que o trigger já tenha feito.
    await context.supabase.from("profiles").upsert(
      {
        id: created.user.id,
        full_name: data.full_name,
      },
      { onConflict: "id" },
    );

    await context.supabase.rpc("log_user_admin_event", {
      _actor_id: context.userId,
      _target_user_id: created.user.id,
      _action: "invite",
      _metadata: { role: data.role, email: data.email },
    });

    return { user_id: created.user.id };
  });

// =============================================================
// changeUserRole
// =============================================================
export const changeUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => changeRoleSchema.parse(data))
  .handler(async ({ data, context }) => {
    const isAdmin = await getIsAdmin(context);
    assertIsAdmin(isAdmin);

    if (data.user_id === context.userId) {
      throw new Error("Você não pode alterar seu próprio papel.");
    }

    const { data: roles, error: rolesErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user_id);
    if (rolesErr) throw new Error(rolesErr.message);

    const currentRoles = (roles ?? []).map((r) => r.role);
    if (currentRoles.includes(data.role)) {
      return { ok: true };
    }

    // Remove todos os papéis atuais e insere o novo. Isso garante um papel único por usuário,
    // evitando conflitos e simplificando a lógica de "último admin".
    const { error: delErr } = await context.supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id);
    if (delErr) throw new Error(delErr.message);

    const { error: insErr } = await context.supabase
      .from("user_roles")
      .insert({ user_id: data.user_id, role: data.role });
    if (insErr) throw new Error(insErr.message);

    await context.supabase.rpc("log_user_admin_event", {
      _actor_id: context.userId,
      _target_user_id: data.user_id,
      _action: "role_change",
      _metadata: { new_role: data.role, previous_roles: currentRoles },
    });

    return { ok: true };
  });

// =============================================================
// toggleUserBlock
// =============================================================
export const toggleUserBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => userIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const isAdmin = await getIsAdmin(context);
    assertIsAdmin(isAdmin);

    if (data.user_id === context.userId) {
      throw new Error("Você não pode bloquear a si mesmo.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verifica o estado atual para determinar a ação e impedir desbloqueio de não-bloqueado.
    const {
      data: { user },
      error: getErr,
    } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
    if (getErr) throw new Error(getErr.message);
    if (!user) throw new Error("Usuário não encontrado.");

    const isBanned = !!user.banned_until && new Date(user.banned_until) > new Date();

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      ban_duration: isBanned ? "0" : "infinite",
    });
    if (error) throw new Error(error.message);

    await context.supabase.rpc("log_user_admin_event", {
      _actor_id: context.userId,
      _target_user_id: data.user_id,
      _action: isBanned ? "unblock" : "block",
      _metadata: { previous_banned_until: user.banned_until },
    });

    return { ok: true, unblocked: isBanned };
  });

// =============================================================
// Exclusão de usuários — INTENCIONALMENTE INEXISTENTE
// =============================================================
// Requisito aprovado da Sprint 15.2.2B: usuários NUNCA são excluídos.
// A remoção de acesso é feita exclusivamente por `toggleUserBlock`, que usa o
// mecanismo oficial do Supabase Auth (`ban_duration`). Isso preserva perfil,
// papéis, autoria (`created_by`/`owner_id`) e toda a trilha histórica do CRM.
//
// Não adicione `supabaseAdmin.auth.admin.deleteUser()` aqui. Além desta regra,
// o banco impede a exclusão física: `profiles.id` e `user_roles.user_id`
// referenciam `auth.users` com ON DELETE RESTRICT.

// =============================================================
// listAuditEvents
// =============================================================
export const listAuditEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AuditEvent[]> => {
    const isAdmin = await getIsAdmin(context);
    assertIsAdmin(isAdmin);

    const { data: events, error } = await context.supabase
      .from("user_admin_audit_events")
      .select(
        "id, actor_id, actor_email, actor_name, target_user_id, target_email, target_name, action, metadata, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const userIds = Array.from(
      new Set([
        ...(events ?? []).map((e) => e.actor_id),
        ...(events ?? []).map((e) => e.target_user_id).filter(Boolean),
      ]),
    ) as string[];

    // O snapshot gravado no evento é a fonte primária de identidade e sobrevive a
    // qualquer alteração posterior no cadastro. As buscas abaixo são apenas fallback
    // para eventos legados, gravados antes da introdução das colunas de snapshot.
    const profileNames = await fetchUserProfileNames(context.supabase, userIds);
    const authMap: Record<string, string | null> = {};

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const {
      data: { users },
      error: listErr,
    } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) throw new Error(listErr.message);
    for (const u of users ?? []) {
      authMap[u.id] = u.email ?? null;
    }

    return (events ?? []).map((e) => {
      const metadata: Record<string, string | number | boolean | null> = {};
      if (e.metadata && typeof e.metadata === "object") {
        for (const [key, value] of Object.entries(e.metadata)) {
          if (
            value === null ||
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
          ) {
            metadata[key] = value;
          }
        }
      }

      return {
        id: e.id,
        actor_id: e.actor_id,
        actor_email: e.actor_email ?? authMap[e.actor_id] ?? null,
        actor_name: e.actor_name ?? profileNames[e.actor_id] ?? null,
        target_user_id: e.target_user_id,
        target_email:
          e.target_email ?? (e.target_user_id ? (authMap[e.target_user_id] ?? null) : null),
        target_name:
          e.target_name ?? (e.target_user_id ? (profileNames[e.target_user_id] ?? null) : null),
        action: e.action,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        created_at: e.created_at,
      };
    });
  });
