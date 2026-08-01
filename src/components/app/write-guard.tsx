import type { ReactNode } from "react";
import { useCurrentRole } from "@/hooks/use-current-role";

export interface WriteGuardProps {
  children: ReactNode;
  /** Exige papel admin (ações administrativas). */
  admin?: boolean;
  /** Conteúdo alternativo para leitores (opcional). */
  fallback?: ReactNode;
}

/**
 * Oculta ações de escrita para o papel `viewer`.
 * Alinhamento visual apenas — a segurança real permanece no banco (RLS).
 */
export function WriteGuard({ children, admin = false, fallback = null }: WriteGuardProps) {
  const { canWrite, canAdmin } = useCurrentRole();
  const allowed = admin ? canAdmin : canWrite;
  return <>{allowed ? children : fallback}</>;
}
