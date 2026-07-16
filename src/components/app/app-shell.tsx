import type { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";

export interface AppShellProps {
  children: ReactNode;
}

/**
 * Casca visual da área autenticada.
 * Composição: Sidebar (lateral) + Topbar (topo) + conteúdo.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppTopbar />
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
