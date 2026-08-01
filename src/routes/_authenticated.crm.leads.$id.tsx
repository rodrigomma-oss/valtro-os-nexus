import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibilidade VOS-001B.1 — rota legada do CRM. */
export const Route = createFileRoute("/_authenticated/crm/leads/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/os/comercial/leads/$id", params: { id: params.id }, search: { proposta: undefined, acao: undefined } });
  },
});
