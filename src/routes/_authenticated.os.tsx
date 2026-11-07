import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppLayout } from "@/layouts/app-layout";

export const Route = createFileRoute("/_authenticated/os")({
  component: OsLayoutRoute,
  head: () => ({
    meta: [
      { title: "Valtro OS — Sistema Operacional da Valtro Labs" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function OsLayoutRoute() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
