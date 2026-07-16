import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface TimelineItem {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  date: string;
  tone?: "default" | "success" | "warning" | "muted";
}

export interface TimelineCardProps {
  title?: string;
  items: TimelineItem[];
  className?: string;
}

const TONE_STYLES: Record<NonNullable<TimelineItem["tone"]>, string> = {
  default: "bg-primary/10 text-primary ring-primary/20",
  success: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-100 text-amber-700 ring-amber-200",
  muted: "bg-muted text-muted-foreground ring-border",
};

/**
 * Timeline vertical do lead — histórico de interações.
 * Cada item exibe ícone, título, descrição e data.
 */
export function TimelineCard({
  title = "Histórico",
  items,
  className,
}: TimelineCardProps) {
  return (
    <Card className={cn("shadow-soft", className)}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ol className="relative">
          {items.map((item, idx) => {
            const Icon = item.icon;
            const tone = item.tone ?? "default";
            const isLast = idx === items.length - 1;
            return (
              <li key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
                {!isLast && (
                  <span
                    aria-hidden
                    className="absolute left-4 top-9 -bottom-1 w-px bg-border"
                  />
                )}
                <div
                  className={cn(
                    "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-offset-0",
                    TONE_STYLES[tone],
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <p className="text-sm font-semibold text-foreground">
                      {item.title}
                    </p>
                    <time className="text-xs text-muted-foreground shrink-0">
                      {item.date}
                    </time>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
