import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

// No Cloudflare Workers, arquivos estáticos devem estar no diretório de build
// ou lidos via importações diretas se forem pequenos. 
// Para TanStack Start na Edge, fs.readFile(process.cwd() + "...") pode falhar se o arquivo não estiver no bundle.
const DOCS_DIR = path.join(process.cwd(), "docs/api");

const DOC_FILES: Record<string, string> = {
  "getting-started": "getting-started.md",
  "authentication": "authentication.md",
  "versioning": "versioning.md",
  "pipeline": "pipeline.md",
  "errors": "errors.md",
  "roadmap": "roadmap.md",
  "changelog": "changelog.md",
  "implementation-status": "implementation-status.md",
  "sdk-strategy": "sdk-strategy.md",
  "integration-guide": "integration-guide.md",
};

export const getApiDoc = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ slug: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const fileName = DOC_FILES[data.slug as keyof typeof DOC_FILES];
    if (!fileName) {
      console.error(`[getApiDoc] Slug not found in mapping: ${data.slug}`);
      throw new Error("Document not found");
    }

    try {
      const filePath = path.join(DOCS_DIR, fileName);
      const content = await fs.readFile(filePath, "utf-8");
      return { content };
    } catch (error: any) {
      console.error(`[getApiDoc] Error reading doc ${data.slug} at ${fileName}:`, error.message);
      throw new Error(`Failed to read document: ${data.slug}`);
    }
  });

export const getApiSpec = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const filePath = path.join(DOCS_DIR, "openapi-v1.yaml");
      const content = await fs.readFile(filePath, "utf-8");
      return { content };
    } catch (error) {
      console.error("Error reading api spec:", error);
      throw new Error("Failed to read api spec");
    }
  });
