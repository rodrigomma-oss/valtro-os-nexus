import type { ProjectStatus } from "@/types/project";
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_TONE } from "@/types/project";
import { cn } from "@/lib/utils";

export function ProjectStatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        PROJECT_STATUS_TONE[status],
        className,
      )}
    >
      {PROJECT_STATUS_LABEL[status]}
    </span>
  );
}
