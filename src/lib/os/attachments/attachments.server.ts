/* eslint-disable @typescript-eslint/no-explicit-any */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

export const ALLOWED_ENTITY_TYPES = ["foundation_test", "ticket", "bug", "feedback", "beta_participant"] as const;
export type EntityType = (typeof ALLOWED_ENTITY_TYPES)[number];

export async function validateEntityAccess(userId: string, entityType: string, entityId: string) {
  // In this sprint, we only support foundation_test for testing
  if (entityType === "foundation_test") return true;
  
  // Future implementation: check access based on entityType and entityId
  return false;
}

export async function prepareUpload(params: {
  userId: string;
  entityType: EntityType;
  entityId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const { userId, entityType, entityId, filename, mimeType, sizeBytes } = params;

  // 1. Validate entity access
  const hasAccess = await validateEntityAccess(userId, entityType, entityId);
  if (!hasAccess) throw new Error("Acesso negado à entidade.");

  // 2. Validate attachment count (max 5 active)
  const { count, error: countError } = await supabaseAdmin
    .from("attachments")
    .select("*", { count: "exact", head: true })
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .is("deleted_at", null);

  if (countError) throw countError;
  if (count && count >= 5) throw new Error("Limite de 5 anexos por entidade atingido.");

  // 3. Generate secure path and metadata
  const attachmentId = crypto.randomUUID();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const storagePath = `${entityType}/${entityId}/${attachmentId}-${sanitizedFilename}`;

  // 4. Generate signed upload URL (valid for 5 mins)
  const { data, error: storageError } = await supabaseAdmin.storage
    .from("os-attachments")
    .createSignedUploadUrl(storagePath);

  if (storageError) throw storageError;

  return {
    attachmentId,
    uploadUrl: data.signedUrl,
    token: data.token,
    storagePath,
  };
}

export async function finalizeUpload(params: {
  userId: string;
  attachmentId: string;
  entityType: string;
  entityId: string;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const { userId, attachmentId, entityType, entityId, storagePath, originalFilename, mimeType, sizeBytes } = params;

  // 1. Verify object exists in storage
  const { data: fileData, error: fileError } = await supabaseAdmin.storage
    .from("os-attachments")
    .list(storagePath.split("/").slice(0, -1).join("/"), {
      search: storagePath.split("/").pop(),
    });

  if (fileError || !fileData || fileData.length === 0) {
    throw new Error("Arquivo não encontrado no storage.");
  }

  // 2. Create database record
  const storedFilename = storagePath.split("/").pop()!;
  const { data, error } = await supabaseAdmin
    .from("attachments")
    .insert({
      id: attachmentId,
      entity_type: entityType,
      entity_id: entityId,
      storage_path: storagePath,
      original_filename: originalFilename,
      stored_filename: storedFilename,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      uploaded_by: userId,
      metadata: {},
    })
    .select()
    .single();

  if (error) {
    // Cleanup orphan object if DB insert fails
    await supabaseAdmin.storage.from("os-attachments").remove([storagePath]);
    throw error;
  }

  return data;
}

export async function getDownloadUrl(userId: string, attachmentId: string) {
  // 1. Fetch attachment record
  const { data: attachment, error } = await supabaseAdmin
    .from("attachments")
    .select("*")
    .eq("id", attachmentId)
    .is("deleted_at", null)
    .single();

  if (error || !attachment) throw new Error("Anexo não encontrado.");

  // 2. Validate access to entity (using stored entity_type/entity_id)
  const hasAccess = await validateEntityAccess(userId, attachment.entity_type, attachment.entity_id);
  if (!hasAccess) throw new Error("Acesso negado.");

  // 3. Generate signed URL (5 mins)
  const { data, error: storageError } = await supabaseAdmin.storage
    .from("os-attachments")
    .createSignedUrl(attachment.storage_path, 300);

  if (storageError) throw storageError;

  return data.signedUrl;
}

export async function removeAttachment(userId: string, attachmentId: string) {
  const { data: attachment, error: fetchError } = await supabaseAdmin
    .from("attachments")
    .select("*")
    .eq("id", attachmentId)
    .single();

  if (fetchError || !attachment) throw new Error("Anexo não encontrado.");

  // Logic removal
  const { error: updateError } = await supabaseAdmin
    .from("attachments")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: userId,
    })
    .eq("id", attachmentId);

  if (updateError) throw updateError;
  
  return { success: true };
}
