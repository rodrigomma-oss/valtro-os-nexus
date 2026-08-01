/**
 * Anexos do Valtro OS — camada server-only (SEC-001B.1).
 *
 * Regras de segurança:
 * - Nenhuma função é executável sem contexto autenticado (requireSupabaseAuth).
 * - A autoria (uploaded_by / deleted_by) vem exclusivamente de context.userId.
 * - Leituras de entidade/anexo usam o client do usuário (RLS aplicada).
 * - supabaseAdmin é usado apenas para (a) Storage (URLs assinadas, bucket privado)
 *   e (b) escrita em `attachments`, sempre APÓS validação explícita de papel e
 *   de acesso do usuário à entidade.
 * - Logs estruturados nunca incluem conteúdo de arquivo, URL assinada ou token.
 */
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AuthedContext = {
  supabase: any;
  userId: string;
};

const MAX_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_PER_ENTITY = 5;

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

/** entityType -> tabela consultada com o client do usuário (RLS). */
const ENTITY_TABLES: Record<string, string> = {
  ticket: "tickets",
  client: "clients",
  project: "projects",
  lead: "leads",
  client_service: "client_services",
  bug: "bugs",
  feedback: "feedback",
  beta_participant: "beta_participants",
};

export function requestId(): string | null {
  try {
    return getRequestHeader("x-request-id") ?? null;
  } catch {
    return null;
  }
}

export function log(action: string, payload: Record<string, unknown>) {
  console.info(
    JSON.stringify({ scope: "os.attachments", action, request_id: requestId(), ...payload }),
  );
}

class AuthzError extends Error {}

function requireContext(context: AuthedContext | undefined): AuthedContext {
  if (!context?.userId || !context.supabase) {
    log("auth_missing", {});
    throw new AuthzError("Não autenticado.");
  }
  return context;
}

async function hasRole(context: AuthedContext, role: "admin" | "operator" | "viewer") {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: role,
  });
  return data === true;
}

async function requireWriteRole(context: AuthedContext, action: string) {
  const allowed = (await hasRole(context, "admin")) || (await hasRole(context, "operator"));
  if (!allowed) {
    log("authz_denied", { action, user_id: context.userId, reason: "role" });
    throw new AuthzError("Sem permissão para esta operação.");
  }
}

/** Confirma que a entidade existe E é visível para o usuário autenticado (RLS). */
async function requireEntityAccess(
  context: AuthedContext,
  entityType: string,
  entityId: string,
  action: string,
) {
  const table = ENTITY_TABLES[entityType];
  if (!table) {
    log("authz_denied", { action, user_id: context.userId, entity_type: entityType, reason: "entity_type" });
    throw new AuthzError("Tipo de entidade inválido para anexos.");
  }
  const { data, error } = await context.supabase
    .from(table)
    .select("id")
    .eq("id", entityId)
    .maybeSingle();
  if (error || !data) {
    log("authz_denied", {
      action,
      user_id: context.userId,
      entity_type: entityType,
      entity_id: entityId,
      reason: "entity_not_accessible",
    });
    throw new AuthzError("Entidade não encontrada ou inacessível.");
  }
}

async function loadAttachmentForUser(context: AuthedContext, attachmentId: string, action: string) {
  const { data, error } = await context.supabase
    .from("attachments")
    .select("id, entity_type, entity_id, storage_path, deleted_at")
    .eq("id", attachmentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) {
    log("authz_denied", { action, user_id: context.userId, attachment_id: attachmentId, reason: "not_found" });
    throw new AuthzError("Anexo não encontrado.");
  }
  await requireEntityAccess(context, data.entity_type, data.entity_id, action);
  return data as {
    id: string;
    entity_type: string;
    entity_id: string;
    storage_path: string;
    deleted_at: string | null;
  };
}

export async function prepareAttachmentUpload(
  context: AuthedContext | undefined,
  params: {
    entityType: string;
    entityId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
  },
) {
  const ctx = requireContext(context);
  const { entityType, entityId, filename, mimeType, sizeBytes } = params;

  await requireWriteRole(ctx, "prepareUpload");
  await requireEntityAccess(ctx, entityType, entityId, "prepareUpload");

  if (!ALLOWED_MIME.has(mimeType)) {
    log("authz_denied", { action: "prepareUpload", user_id: ctx.userId, reason: "mime", mime_type: mimeType });
    throw new AuthzError("Tipo de arquivo não permitido.");
  }
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_SIZE_BYTES) {
    log("authz_denied", { action: "prepareUpload", user_id: ctx.userId, reason: "size", size_bytes: sizeBytes });
    throw new AuthzError("Arquivo excede o limite de 20 MB.");
  }

  const admin = supabaseAdmin as any;

  const { count, error: countError } = await admin
    .from("attachments")
    .select("*", { count: "exact", head: true })
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .is("deleted_at", null);
  if (countError) throw new Error(countError.message);
  if ((count ?? 0) >= MAX_PER_ENTITY) {
    log("authz_denied", { action: "prepareUpload", user_id: ctx.userId, reason: "limit" });
    throw new AuthzError(`Limite de ${MAX_PER_ENTITY} anexos por entidade atingido.`);
  }

  const storagePath = `${entityType}/${entityId}/${Date.now()}-${filename}`;
  const { data: attachment, error: insertError } = await admin
    .from("attachments")
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      storage_path: storagePath,
      original_filename: filename,
      stored_filename: filename,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      uploaded_by: ctx.userId,
      metadata: {},
    })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);

  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
    .from("os-attachments")
    .createSignedUploadUrl(storagePath);
  if (uploadError) throw new Error(uploadError.message);

  log("upload_authorized", {
    user_id: ctx.userId,
    entity_type: entityType,
    entity_id: entityId,
    attachment_id: attachment.id,
    size_bytes: sizeBytes,
    mime_type: mimeType,
  });

  return {
    attachmentId: attachment.id as string,
    uploadUrl: uploadData.signedUrl,
    storagePath,
  };
}

export async function finalizeAttachmentUpload(
  context: AuthedContext | undefined,
  attachmentId: string,
  storagePath: string,
) {
  const ctx = requireContext(context);
  await requireWriteRole(ctx, "finalizeUpload");
  const attachment = await loadAttachmentForUser(ctx, attachmentId, "finalizeUpload");

  if (attachment.storage_path !== storagePath) {
    log("authz_denied", { action: "finalizeUpload", user_id: ctx.userId, attachment_id: attachmentId, reason: "path_mismatch" });
    throw new AuthzError("Caminho de armazenamento inválido.");
  }

  const admin = supabaseAdmin as any;
  const { data: fileExists } = await supabaseAdmin.storage
    .from("os-attachments")
    .list(storagePath.split("/").slice(0, -1).join("/"), {
      search: storagePath.split("/").pop(),
    });

  if (!fileExists || fileExists.length === 0) {
    // Exclusão física é bloqueada por trigger; usamos remoção lógica autorizada.
    await admin
      .from("attachments")
      .update({ deleted_at: new Date().toISOString(), deleted_by: ctx.userId })
      .eq("id", attachmentId)
      .is("deleted_at", null);
    log("upload_not_detected", { user_id: ctx.userId, attachment_id: attachmentId });
    throw new Error("Upload não detectado no storage.");
  }


  log("upload_finalized", { user_id: ctx.userId, attachment_id: attachmentId });
  return { success: true };
}

export async function getAttachmentDownloadUrl(
  context: AuthedContext | undefined,
  attachmentId: string,
) {
  const ctx = requireContext(context);
  const attachment = await loadAttachmentForUser(ctx, attachmentId, "download");

  const { data, error } = await supabaseAdmin.storage
    .from("os-attachments")
    .createSignedUrl(attachment.storage_path, 300); // 5 minutos
  if (error) throw new Error(error.message);

  log("download_authorized", {
    user_id: ctx.userId,
    attachment_id: attachmentId,
    entity_type: attachment.entity_type,
    entity_id: attachment.entity_id,
  });

  return { url: data.signedUrl };
}

export async function deleteAttachment(
  context: AuthedContext | undefined,
  attachmentId: string,
) {
  const ctx = requireContext(context);
  await requireWriteRole(ctx, "delete");
  const attachment = await loadAttachmentForUser(ctx, attachmentId, "delete");

  const admin = supabaseAdmin as any;
  const { error } = await admin
    .from("attachments")
    .update({ deleted_at: new Date().toISOString(), deleted_by: ctx.userId })
    .eq("id", attachment.id)
    .is("deleted_at", null);
  if (error) throw new Error(error.message);

  log("delete_authorized", { user_id: ctx.userId, attachment_id: attachmentId });
  return { success: true };
}

export interface AttachmentRow {
  id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export async function listAttachments(
  context: AuthedContext | undefined,
  entityType: string,
  entityId: string,
) {
  const ctx = requireContext(context);
  await requireEntityAccess(ctx, entityType, entityId, "list");

  const { data, error } = await ctx.supabase
    .from("attachments")
    .select("id, original_filename, mime_type, size_bytes, created_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  log("list_authorized", {
    user_id: ctx.userId,
    entity_type: entityType,
    entity_id: entityId,
    count: data?.length ?? 0,
  });
  return (data ?? []) as AttachmentRow[];
}

export const ATTACHMENT_LIMITS = { MAX_SIZE_BYTES, MAX_PER_ENTITY };
export const ATTACHMENT_ALLOWED_MIME = ALLOWED_MIME;
export const ATTACHMENT_ENTITY_TABLES = ENTITY_TABLES;
