/**
 * Anexos do Valtro OS — Server Functions (SEC-001B.1).
 *
 * Todas exigem requireSupabaseAuth; a autoria vem de context.userId e nunca
 * de dados enviados pelo cliente. Este módulo é apenas um wrapper fino.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  prepareAttachmentUpload,
  finalizeAttachmentUpload,
  getAttachmentDownloadUrl,
  deleteAttachment,
  listAttachments,
} from "./attachments.server";

export const prepareAttachmentUploadFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      entityType: z.string().min(1).max(40),
      entityId: z.string().uuid(),
      filename: z.string().trim().min(1).max(255),
      mimeType: z.string().min(1).max(120),
      // Limite alinhado ao bucket privado os-attachments (20 MB).
      sizeBytes: z.number().int().positive().max(20 * 1024 * 1024),
    })
  )
  .handler(async ({ data, context }) => {
    return prepareAttachmentUpload(context, data);
  });

export const finalizeAttachmentUploadFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      attachmentId: z.string().uuid(),
      storagePath: z.string().min(1).max(500),
    })
  )
  .handler(async ({ data, context }) => {
    return finalizeAttachmentUpload(context, data.attachmentId, data.storagePath);
  });

export const getAttachmentDownloadUrlFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ attachmentId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    return getAttachmentDownloadUrl(context, data.attachmentId);
  });

export const deleteAttachmentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ attachmentId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    return deleteAttachment(context, data.attachmentId);
  });

export const listAttachmentsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({ entityType: z.string().min(1).max(40), entityId: z.string().uuid() })
  )
  .handler(async ({ data, context }) => {
    return listAttachments(context, data.entityType, data.entityId);
  });
