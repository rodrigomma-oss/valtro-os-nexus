import { Badge } from "@/components/ui/badge";
import {
  BETA_PARTICIPANT_STATUS_LABEL,
  BETA_PARTICIPANT_STATUS_TONE,
  BETA_PARTICIPANT_INTEREST_LABEL,
} from "@/lib/os/beta-participants-ui";
import type {
  BetaParticipantStatus,
  BetaParticipantInterest,
} from "@/types/beta-participant";

const VARIANTS: Record<string, any> = {
  neutral: "secondary",
  info: "outline",
  success: "success",
  warning: "warning",
  error: "destructive",
};

export function BetaParticipantStatusBadge({ status }: { status: BetaParticipantStatus }) {
  return (
    <Badge
      variant={VARIANTS[BETA_PARTICIPANT_STATUS_TONE[status]] ?? "outline"}
      className="whitespace-nowrap"
    >
      {BETA_PARTICIPANT_STATUS_LABEL[status]}
    </Badge>
  );
}

export function BetaParticipantInterestBadge({
  interest,
}: {
  interest: BetaParticipantInterest;
}) {
  return (
    <Badge variant="outline" className="whitespace-nowrap font-normal text-muted-foreground">
      {BETA_PARTICIPANT_INTEREST_LABEL[interest]}
    </Badge>
  );
}
