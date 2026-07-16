import type { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";

export interface AppShellProps {
  children: ReactNode;
  breadcrumb?: ReactNode;
}

/**
 * Casca visual da área autenticada.
 * Composição: Sidebar (lateral) + Topbar (topo) + conteúdo.
 * O breadcrumb da topbar pode ser injetado pelas páginas via prop.
 */
export function AppShell({ children, breadcrumb }: AppShellProps) {
  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppTopbar breadcrumb={breadcrumb} />
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
