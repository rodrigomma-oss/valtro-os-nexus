import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibilidade VOS-001B.1 — rota legada do CRM. */
export const Route = createFileRoute("/_authenticated/crm/admin/usuarios")({
  beforeLoad: () => {
    throw redirect({ to: "/os/admin/usuarios" });
  },
});
