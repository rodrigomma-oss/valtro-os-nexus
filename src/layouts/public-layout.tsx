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
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-elevated"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo">{children}</main>
      <Footer />
    </div>
  );
}
