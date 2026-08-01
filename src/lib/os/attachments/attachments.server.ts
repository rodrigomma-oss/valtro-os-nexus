import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * @ts-nocheck - Aguardando sincronização de tipos do Supabase
 */

export async function prepareAttachmentUpload(params: {
  entityType: string;
  entityId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const { entityType, entityId, filename, mimeType, sizeBytes } = params;

  // 1. Validar limite de anexos (ex: 5 por entidade)
  const { count, error: countError } = await supabaseAdmin
    .from("attachments" as any)
    .select("*", { count: "exact", head: true })
    .eq("entity_type" as any, entityType)
    .eq("entity_id" as any, entityId)
    .is("deleted_at" as any, null);

  if (countError) throw countError;
  if (count && count >= 5) {
    throw new Error("Limite de 5 anexos por entidade atingido.");
  }

  // 2. Criar registro pendente
  const storagePath = `${entityType}/${entityId}/${Date.now()}-${filename}`;
  const { data: attachment, error: insertError } = await supabaseAdmin
    .from("attachments" as any)
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      storage_path: storagePath,
      original_filename: filename,
      stored_filename: filename,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      uploaded_by: (await supabaseAdmin.auth.getUser()).data.user?.id || "",
      metadata: {},
    } as any)
    .select()
    .single();

  if (insertError) throw insertError;

  // 3. Gerar URL assinada para upload
  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
    .from("os-attachments")
    .createSignedUploadUrl(storagePath);

  if (uploadError) throw uploadError;

  return {
    attachmentId: (attachment as any).id,
    uploadUrl: uploadData.signedUrl,
    storagePath,
  };
}

export async function finalizeAttachmentUpload(
  attachmentId: string,
  storagePath: string
) {
  // Verificar se o arquivo realmente existe no storage
  const { data: fileExists } = await supabaseAdmin.storage
    .from("os-attachments")
    .list(storagePath.split("/").slice(0, -1).join("/"), {
      search: storagePath.split("/").pop(),
    });

  if (!fileExists || fileExists.length === 0) {
    // Limpar registro se o upload falhou
    await supabaseAdmin.from("attachments" as any).delete().eq("id" as any, attachmentId);
    throw new Error("Upload não detectado no storage.");
  }

  return { success: true };
}

export async function getAttachmentDownloadUrl(attachmentId: string) {
  const { data: attachment, error } = await supabaseAdmin
    .from("attachments" as any)
    .select("*")
    .eq("id" as any, attachmentId)
    .is("deleted_at" as any, null)
    .single();

  if (error || !attachment) throw new Error("Anexo não encontrado.");

  const { data, error: urlError } = await supabaseAdmin.storage
    .from("os-attachments")
    .createSignedUrl((attachment as any).storage_path, 300); // 5 minutos

  if (urlError) throw urlError;

  return { url: data.signedUrl };
}

export async function deleteAttachment(attachmentId: string) {
  const { data: user } = await supabaseAdmin.auth.getUser();

  const { error } = await supabaseAdmin
    .from("attachments" as any)
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.user?.id,
    } as any)
    .eq("id" as any, attachmentId);

  if (error) throw error;

  return { success: true };
}
