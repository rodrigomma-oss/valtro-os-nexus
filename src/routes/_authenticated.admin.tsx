import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Users } from "lucide-react";
import { AppLayout } from "@/layouts/app-layout";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({
    meta: [{ title: "Admin — Valtro Labs" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});

function AdminPage() {
  return (
    <AppLayout>
      <div className="p-6 md:p-10 space-y-6">
        <PageHeader
          title="Administração"
          description="Ferramentas de gestão interna da plataforma."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link to="/os/admin/usuarios" search={{}} className="group">
            <Card className="transition-all hover:border-primary/50 hover:shadow-soft">
              <CardHeader className="pb-2">
                <div className="mb-2 grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-primary">
                  <Users className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <CardTitle className="text-base">Usuários</CardTitle>
                <CardDescription>Gerencie papéis, convites e acessos.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground group-hover:text-primary">
                  Abrir administração de usuários →
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/os/admin/integracoes" search={{}} className="group">
            <Card className="transition-all hover:border-primary/50 hover:shadow-soft">
              <CardHeader className="pb-2">
                <div className="mb-2 grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-primary">
                  <Shield className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <CardTitle className="text-base">Integrações</CardTitle>
                <CardDescription>Configure Google Calendar e webhooks.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground group-hover:text-primary">
                  Abrir integrações →
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
