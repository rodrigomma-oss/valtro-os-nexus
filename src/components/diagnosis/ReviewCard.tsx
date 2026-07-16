import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReviewCardProps {
  title: string;
  items: { label: string; value: string }[];
  onEdit?: () => void;
}

export function ReviewCard({ title, items, onEdit }: ReviewCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold tracking-wide text-foreground uppercase">{title}</h3>
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit} className="gap-1.5 text-primary h-8">
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
        )}
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {items.map((it) => (
          <div key={it.label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{it.label}</dt>
            <dd className="text-sm text-foreground mt-0.5 break-words">{it.value || <span className="text-muted-foreground/70 italic">Não informado</span>}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
