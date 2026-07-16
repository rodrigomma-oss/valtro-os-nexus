import { ReactNode } from "react";
import { Logo } from "@/components/shared/logo";

interface DiagnosisLayoutProps {
  children: ReactNode;
  topSlot?: ReactNode;
  bottomSlot?: ReactNode;
}

export function DiagnosisLayout({ children, topSlot, bottomSlot }: DiagnosisLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="mx-auto w-full max-w-[820px] px-6 py-5 flex items-center justify-between">
          <Logo variant="compact" />
          <span className="text-xs text-muted-foreground tracking-wide uppercase">Portal de Diagnóstico</span>
        </div>
        {topSlot}
      </header>
      <main className="flex-1">
        <div className="mx-auto w-full max-w-[820px] px-6 py-12 md:py-16">{children}</div>
      </main>
      {bottomSlot}
    </div>
  );
}
