import { ReactNode } from "react";
import { Label } from "@/components/ui/label";

interface DiagnosisQuestionProps {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
  optional?: boolean;
}

export function DiagnosisQuestion({ label, hint, htmlFor, children, optional }: DiagnosisQuestionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
          {label}
        </Label>
        {optional && <span className="text-xs text-muted-foreground">Opcional</span>}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}
