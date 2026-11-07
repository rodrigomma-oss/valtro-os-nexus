import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface NavigationFooterProps {
  onBack?: () => void;
  onNext?: () => void;
  onSaveLater?: () => void;
  nextLabel?: string;
  backDisabled?: boolean;
  nextDisabled?: boolean;
}

export function NavigationFooter({
  onBack,
  onNext,
  onSaveLater,
  nextLabel = "Continuar",
  backDisabled,
  nextDisabled,
}: NavigationFooterProps) {
  return (
    <div className="mt-12 pt-6 border-t border-border/60 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={onBack} disabled={backDisabled} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        {onSaveLater && (
          <Button variant="ghost" onClick={onSaveLater} className="text-muted-foreground hidden sm:inline-flex">
            Salvar e continuar depois
          </Button>
        )}
      </div>
      <Button onClick={onNext} disabled={nextDisabled} className="gap-2 min-w-[160px]">
        {nextLabel}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
