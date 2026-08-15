import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PresentationLayoutProps {
  children: ReactNode;
  themeClass?: string;
}

/**
 * Layout independente para o Viewer da Apresentação Comercial.
 * Remove sidebar, topbar e estilos administrativos do CRM.
 */
export function PresentationLayout({ children, themeClass }: PresentationLayoutProps) {
  return (
    <div className={cn(
      "min-h-screen w-full overflow-x-hidden bg-background text-foreground selection:bg-primary/20",
      themeClass
    )}>
      {/* Reset visual e isolamento */}
      <main className="relative z-0">
        {children}
      </main>
    </div>
  );
}
