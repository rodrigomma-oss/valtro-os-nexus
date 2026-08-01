/**
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  prepareAttachmentUpload,
  finalizeAttachmentUpload,
  getAttachmentDownloadUrl,
  deleteAttachment,
} from "./attachments.server";

export const prepareAttachmentUploadFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      entityType: z.string().min(1),
      entityId: z.string().uuid(),
      filename: z.string().trim().min(1).max(255),
      mimeType: z.string().min(1),
      // Limite alinhado ao bucket privado os-attachments (20 MB).
      sizeBytes: z.number().int().positive().max(20 * 1024 * 1024),
    })
  )
  .handler(async ({ data }) => {
    return prepareAttachmentUpload(data);
  });

export const finalizeAttachmentUploadFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      attachmentId: z.string(),
      storagePath: z.string(),
    })
  )
  .handler(async ({ data }) => {
    return finalizeAttachmentUpload(data.attachmentId, data.storagePath);
  });

export const getAttachmentDownloadUrlFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ attachmentId: z.string() }))
  .handler(async ({ data }) => {
    return getAttachmentDownloadUrl(data.attachmentId);
  });

export const deleteAttachmentFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ attachmentId: z.string() }))
  .handler(async ({ data }) => {
    return deleteAttachment(data.attachmentId);
  });

export const listAttachmentsFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ entityType: z.string(), entityId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { listAttachments } = await import("./attachments.server");
    return listAttachments(data.entityType, data.entityId);
  });
