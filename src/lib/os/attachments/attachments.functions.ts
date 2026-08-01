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
      entityType: z.string(),
      entityId: z.string(),
      filename: z.string(),
      mimeType: z.string(),
      sizeBytes: z.number(),
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
