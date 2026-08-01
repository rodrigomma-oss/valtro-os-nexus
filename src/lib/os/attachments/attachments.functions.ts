import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as attachmentsServer from "./attachments.server";

export const prepareAttachmentUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    entityType: z.enum(["foundation_test", "ticket", "bug", "feedback", "beta_participant"]),
    entityId: z.string().uuid(),
    filename: z.string().min(1),
    mimeType: z.string(),
    sizeBytes: z.number().positive().max(20971520),
  }).parse(data))
  .handler(async ({ data, context }) => {
    return await attachmentsServer.prepareUpload({
      userId: context.userId,
      ...data,
    });
  });

export const finalizeAttachmentUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    attachmentId: z.string().uuid(),
    entityType: z.string(),
    entityId: z.string().uuid(),
    storagePath: z.string(),
    originalFilename: z.string(),
    mimeType: z.string(),
    sizeBytes: z.number().positive(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    return await attachmentsServer.finalizeUpload({
      userId: context.userId,
      ...data,
    });
  });

export const getAttachmentDownloadUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    attachmentId: z.string().uuid(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    return await attachmentsServer.getDownloadUrl(context.userId, data.attachmentId);
  });

export const deleteAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    attachmentId: z.string().uuid(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    return await attachmentsServer.removeAttachment(context.userId, data.attachmentId);
  });

export const listAttachments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    entityType: z.string(),
    entityId: z.string().uuid(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    // Note: We use context.supabase for RLS-respecting read
    const { data: attachments, error } = await context.supabase
      .from("attachments")
      .select("*")
      .eq("entity_type", data.entityType)
      .eq("entity_id", data.entityId)
      .is("deleted_at", null);

    if (error) throw error;
    return attachments;
  });
