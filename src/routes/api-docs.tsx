import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DevelopersLayout } from "@/components/developers/developers-layout";

export const Route = createFileRoute("/api-docs")({
  component: DevelopersLayoutComponent,
});

function DevelopersLayoutComponent() {
  return (
    <DevelopersLayout>
      <Outlet />
    </DevelopersLayout>
  );
}
