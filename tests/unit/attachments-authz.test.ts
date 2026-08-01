/**
 * SEC-001B.1 — Testes de autenticação/autorização dos anexos.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tanstack/react-start/server", () => ({
  getRequestHeader: () => "req-test-1",
}));

const storage = {
  createSignedUploadUrl: vi.fn(async () => ({ data: { signedUrl: "https://x/upload" }, error: null })),
  createSignedUrl: vi.fn(async () => ({ data: { signedUrl: "https://x/download" }, error: null })),
  list: vi.fn(async () => ({ data: [{ name: "f" }], error: null })),
};

const adminState = { count: 0 };

function adminBuilder(table: string) {
  const chain: any = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
    eq: () => chain,
    is: () => chain,
    single: async () => ({ data: { id: "11111111-1111-1111-1111-111111111111" }, error: null }),
    then: undefined,
  };
  // count query resolves as awaited object
  (chain as any).select = (_sel?: string, opts?: any) => {
    if (opts?.head) {
      return { eq: () => ({ eq: () => ({ is: async () => ({ count: adminState.count, error: null }) }) }) };
    }
    return chain;
  };
  (chain as any).update = () => ({ eq: () => ({ is: async () => ({ error: null }) }) });
  void table;
  return chain;
}

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (t: string) => adminBuilder(t),
    storage: { from: () => storage },
  },
}));

import {
  prepareAttachmentUpload,
  getAttachmentDownloadUrl,
  deleteAttachment,
  listAttachments,
} from "@/lib/os/attachments/attachments.server";

const ENTITY_ID = "22222222-2222-2222-2222-222222222222";
const ATTACHMENT_ID = "33333333-3333-3333-3333-333333333333";
const USER_ID = "44444444-4444-4444-4444-444444444444";

function makeContext(opts: {
  role?: "admin" | "operator" | "viewer";
  entityVisible?: boolean;
  attachment?: any;
  listRows?: any[];
}) {
  const { role = "operator", entityVisible = true } = opts;
  const attachment =
    opts.attachment === undefined
      ? {
          id: ATTACHMENT_ID,
          entity_type: "ticket",
          entity_id: ENTITY_ID,
          storage_path: `ticket/${ENTITY_ID}/1-f.pdf`,
          deleted_at: null,
        }
      : opts.attachment;

  const supabase = {
    rpc: async (_fn: string, args: any) => ({ data: args._role === role, error: null }),
    from: (table: string) => {
      if (table === "attachments") {
        const chain: any = {
          select: () => chain,
          eq: () => chain,
          is: () => chain,
          order: async () => ({ data: opts.listRows ?? [], error: null }),
          maybeSingle: async () => ({ data: attachment, error: null }),
        };
        return chain;
      }
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: entityVisible ? { id: ENTITY_ID } : null, error: null }),
      };
      return chain;
    },
  };
  return { supabase, userId: USER_ID };
}

const validUpload = {
  entityType: "ticket",
  entityId: ENTITY_ID,
  filename: "doc.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1024,
};

beforeEach(() => {
  adminState.count = 0;
});

describe("anexos — autenticação obrigatória (anon / sessão inválida)", () => {
  it("bloqueia upload sem contexto", async () => {
    await expect(prepareAttachmentUpload(undefined, validUpload)).rejects.toThrow(/autenticado/i);
  });
  it("bloqueia download sem contexto", async () => {
    await expect(getAttachmentDownloadUrl(undefined, ATTACHMENT_ID)).rejects.toThrow(/autenticado/i);
  });
  it("bloqueia listagem sem contexto", async () => {
    await expect(listAttachments(undefined, "ticket", ENTITY_ID)).rejects.toThrow(/autenticado/i);
  });
  it("bloqueia exclusão sem contexto", async () => {
    await expect(deleteAttachment(undefined, ATTACHMENT_ID)).rejects.toThrow(/autenticado/i);
  });
  it("bloqueia contexto sem userId (token inválido/expirado)", async () => {
    const ctx = { supabase: makeContext({}).supabase, userId: "" } as any;
    await expect(listAttachments(ctx, "ticket", ENTITY_ID)).rejects.toThrow(/autenticado/i);
  });
});

describe("anexos — autorização por papel", () => {
  it("viewer não pode fazer upload", async () => {
    await expect(
      prepareAttachmentUpload(makeContext({ role: "viewer" }) as any, validUpload),
    ).rejects.toThrow(/permissão/i);
  });
  it("viewer não pode excluir", async () => {
    await expect(deleteAttachment(makeContext({ role: "viewer" }) as any, ATTACHMENT_ID)).rejects.toThrow(
      /permissão/i,
    );
  });
  it("viewer pode listar e baixar", async () => {
    await expect(listAttachments(makeContext({ role: "viewer" }) as any, "ticket", ENTITY_ID)).resolves.toEqual([]);
    await expect(
      getAttachmentDownloadUrl(makeContext({ role: "viewer" }) as any, ATTACHMENT_ID),
    ).resolves.toHaveProperty("url");
  });
  it("operator e admin podem fazer upload", async () => {
    for (const role of ["operator", "admin"] as const) {
      const res = await prepareAttachmentUpload(makeContext({ role }) as any, validUpload);
      expect(res.uploadUrl).toBeTruthy();
    }
  });
  it("operator pode excluir", async () => {
    await expect(deleteAttachment(makeContext({ role: "operator" }) as any, ATTACHMENT_ID)).resolves.toEqual({
      success: true,
    });
  });
});

describe("anexos — validações de entidade e arquivo", () => {
  it("rejeita entityType inválido", async () => {
    await expect(
      listAttachments(makeContext({}) as any, "conta_bancaria", ENTITY_ID),
    ).rejects.toThrow(/inválido/i);
  });
  it("rejeita entidade inacessível/inexistente", async () => {
    await expect(
      prepareAttachmentUpload(makeContext({ entityVisible: false }) as any, validUpload),
    ).rejects.toThrow(/inacessível|não encontrada/i);
  });
  it("rejeita anexo inexistente", async () => {
    await expect(
      getAttachmentDownloadUrl(makeContext({ attachment: null }) as any, ATTACHMENT_ID),
    ).rejects.toThrow(/não encontrado/i);
  });
  it("rejeita MIME não permitido", async () => {
    await expect(
      prepareAttachmentUpload(makeContext({}) as any, { ...validUpload, mimeType: "application/x-msdownload" }),
    ).rejects.toThrow(/não permitido/i);
  });
  it("rejeita tamanho acima de 20 MB", async () => {
    await expect(
      prepareAttachmentUpload(makeContext({}) as any, { ...validUpload, sizeBytes: 21 * 1024 * 1024 }),
    ).rejects.toThrow(/20 MB/i);
  });
  it("respeita limite de 5 anexos por entidade", async () => {
    adminState.count = 5;
    await expect(prepareAttachmentUpload(makeContext({}) as any, validUpload)).rejects.toThrow(/Limite/i);
  });
});
