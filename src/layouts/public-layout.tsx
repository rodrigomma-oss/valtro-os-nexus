import type { ReactNode } from "react";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";

export interface PublicLayoutProps {
  children: ReactNode;
}

/**
 * Layout público — utilizado por todas as páginas institucionais.
 * Mantém o Header e o Footer oficiais da Valtro Labs.
 */
export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
