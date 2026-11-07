import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const parentRoute = source("src/routes/_authenticated.os.atendimento.feedback.tsx");
const indexRoute = source("src/routes/_authenticated.os.atendimento.feedback.index.tsx");
const detailRoute = source("src/routes/_authenticated.os.atendimento.feedback.$id.tsx");
const routeTree = source("src/routeTree.gen.ts");

describe("Feedback route topology", () => {
  it("renders the list only from the index route", () => {
    expect(parentRoute).toContain("component: () => <Outlet />");
    expect(parentRoute).not.toContain("FeedbackList");
    expect(indexRoute).toContain(
      'createFileRoute("/_authenticated/os/atendimento/feedback/")',
    );
    expect(indexRoute).toContain("component: FeedbackList");
  });

  it("registers list and detail as siblings below the feedback layout", () => {
    expect(routeTree).toContain("interface AuthenticatedOsAtendimentoFeedbackRouteChildren");
    expect(routeTree).toContain(
      "AuthenticatedOsAtendimentoFeedbackIndexRoute: typeof AuthenticatedOsAtendimentoFeedbackIndexRoute",
    );
    expect(routeTree).toContain(
      "AuthenticatedOsAtendimentoFeedbackIdRoute: typeof AuthenticatedOsAtendimentoFeedbackIdRoute",
    );
    expect(detailRoute).toContain(
      'createFileRoute("/_authenticated/os/atendimento/feedback/$id")',
    );
    expect(detailRoute).toContain("component: FeedbackDetail");
  });

  it("keeps code, row and Open actions wired to the detail route", () => {
    expect(indexRoute.match(/to="\/os\/atendimento\/feedback\/\$id"/g)).toHaveLength(1);
    expect(indexRoute).toContain(
      'navigate({ to: "/os/atendimento/feedback/$id", params: { id } })',
    );
    expect(indexRoute).toContain("onRowClick={(f) => openFeedback(f.id)}");
    expect(indexRoute).toContain("onClick={() => openFeedback(f.id)}");
  });

  it("keeps direct detail and return-to-list navigation available", () => {
    expect(routeTree).toContain("'/_authenticated/os/atendimento/feedback/$id'");
    expect(detailRoute).toContain('<Link to="/os/atendimento/feedback">');
  });

  it("keeps the API/null-author fallback in the list", () => {
    expect(indexRoute).toContain('f.created_by_name ?? "Sistema/API"');
  });
});
