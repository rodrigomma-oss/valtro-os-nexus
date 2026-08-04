import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Valtro Labs — Soluções inteligentes para negócios digitais" },
      {
        name: "description",
        content:
          "A Valtro Labs desenvolve soluções SaaS proprietárias para simplificar decisões, automatizar processos e impulsionar negócios digitais.",
      },
      { name: "author", content: "Valtro Labs" },
      { name: "theme-color", content: "#2563EB" },
      { property: "og:site_name", content: "Valtro Labs" },
      { property: "og:title", content: "Valtro Labs — Soluções inteligentes para negócios digitais" },
      {
        property: "og:description",
        content:
          "A Valtro Labs desenvolve soluções SaaS proprietárias para simplificar decisões, automatizar processos e impulsionar negócios digitais.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://valtrolabs.pro" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Valtro Labs — Soluções inteligentes para negócios digitais" },
      {
        name: "twitter:description",
        content:
          "A Valtro Labs desenvolve soluções SaaS proprietárias para simplificar decisões, automatizar processos e impulsionar negócios digitais.",
      },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/x7hY6BBKGJQAicQWvxdL5VMGquB3/social-images/social-1783895000377-Capa_Whatsapp.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/x7hY6BBKGJQAicQWvxdL5VMGquB3/social-images/social-1783895000377-Capa_Whatsapp.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon-valtro.ico", sizes: "any" },
      { rel: "icon", type: "image/png", href: "/favicon.png", sizes: "512x512" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "canonical", href: "https://valtrolabs.pro/" },

      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased font-sans">
        <div className="sr-only" aria-hidden="true">
          # Definição de View de Segurança

**Funcionalidade:**

Criar uma view SQL chamada `security_definer_view` que será executada com os privilégios do proprietário da view, não do usuário que a consulta.

**Requisitos Técnicos:**

*   A view deve ser criada em um banco de dados SQL compatível (ex: PostgreSQL, MySQL).
*   A sintaxe exata para definir uma view como `SECURITY DEFINER` pode variar ligeiramente entre os sistemas de gerenciamento de banco de dados.

**Passos Necessários:**

1.  **Definir a Consulta Base:** Escreva a consulta SQL que retornará os dados desejados para a view.
2.  **Criar a View:** Utilize a instrução `CREATE VIEW` com a cláusula `SECURITY DEFINER`.

**Exemplo (PostgreSQL):**

```sql
CREATE VIEW security_definer_view AS
SELECT column1, column2
FROM your_table
WHERE condition;

ALTER VIEW security_definer_view SECURITY DEFINER;
```

**Exemplo (MySQL):**

```sql
CREATE DEFINER = 'owner_user'@'localhost' VIEW security_definer_view AS
SELECT column1, column2
FROM your_table
WHERE condition;
```

**Observações:**

*   Certifique-se de que o usuário proprietário da view tenha as permissões necessárias para acessar os dados subjacentes.
*   O uso de `SECURITY DEFINER` deve ser feito com cautela, pois pode introduzir riscos de segurança se não for configurado corretamente.
        </div>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
