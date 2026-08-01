import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Gate autenticado — Sprint 2B Bloco 1.
 * `ssr: false` porque Supabase persiste sessão em localStorage (indisponível no servidor).
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/auth",
        search: { redirect: location.pathname + location.search + location.hash },
      });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
