import type { ReactNode } from "react";
import { AppShell } from "@/components/app/app-shell";

export interface AppLayoutProps {
  children: ReactNode;
  breadcrumb?: ReactNode;
}

/**
 * Layout autenticado — utilizado pelo CRM, Portal de Briefing e Admin.
 * Nesta sprint ainda não aplica gate de autenticação.
 */
export function AppLayout({ children, breadcrumb }: AppLayoutProps) {
  return <AppShell breadcrumb={breadcrumb}>{children}</AppShell>;
}
