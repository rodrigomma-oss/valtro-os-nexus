import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppLayout } from "@/layouts/app-layout";

export const Route = createFileRoute("/_authenticated/os")({
  component: CrmLayoutRoute,
  head: () => ({
    meta: [
      { title: "CRM — Valtro Labs" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function CrmLayoutRoute() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
