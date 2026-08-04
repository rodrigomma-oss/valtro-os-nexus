import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Usamos importações dinâmicas com ?raw para garantir que o Vite inclua o conteúdo 
// dos arquivos markdown e yaml no bundle do servidor/edge.
// fs.readFile(process.cwd()) não é confiável em ambientes serverless/edge.

const DOCS_CONTENT = import.meta.glob("/docs/api/*.{md,yaml}", {
  as: "raw",
  eager: true,
});

const DOC_FILES: Record<string, string> = {
  "getting-started": "/docs/api/getting-started.md",
  "authentication": "/docs/api/authentication.md",
  "versioning": "/docs/api/versioning.md",
  "pipeline": "/docs/api/pipeline.md",
  "errors": "/docs/api/errors.md",
  "roadmap": "/docs/api/roadmap.md",
  "changelog": "/docs/api/changelog.md",
  "implementation-status": "/docs/api/implementation-status.md",
  "sdk-strategy": "/docs/api/sdk-strategy.md",
  "integration-guide": "/docs/api/integration-guide.md",
};

export const getApiDoc = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ slug: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const filePath = DOC_FILES[data.slug as keyof typeof DOC_FILES];
    if (!filePath) {
      console.error(`[getApiDoc] Slug not found in mapping: ${data.slug}`);
      throw new Error("Document not found");
    }

    const content = DOCS_CONTENT[filePath];
    if (content === undefined) {
      console.error(`[getApiDoc] Content not found in glob for: ${filePath}`);
      throw new Error(`Failed to read document: ${data.slug}`);
    }

    return { content };
  });

export const getApiSpec = createServerFn({ method: "GET" })
  .handler(async () => {
    const filePath = "/docs/api/openapi-v1.yaml";
    const content = DOCS_CONTENT[filePath];
    
    if (content === undefined) {
      console.error("[getApiSpec] Spec not found in glob");
      throw new Error("Failed to read api spec");
    }

    return { content };
  });
