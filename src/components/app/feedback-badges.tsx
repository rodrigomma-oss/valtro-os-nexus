import { Badge } from "@/components/ui/badge";
import { 
  FEEDBACK_STATUS_LABEL, 
  FEEDBACK_STATUS_TONE, 
  FEEDBACK_TYPE_LABEL,
  FEEDBACK_SOURCE_LABEL,
  FEEDBACK_VALUE_LABEL,
  FEEDBACK_INTEREST_LABEL
} from "@/lib/os/feedback-ui";
import type { 
  FeedbackStatus, 
  FeedbackType, 
  FeedbackSource, 
  FeedbackPerceivedValue, 
  FeedbackSubscriptionInterest 
} from "@/types/feedback";

export function FeedbackStatusBadge({ status }: { status: FeedbackStatus }) {
  const tone = FEEDBACK_STATUS_TONE[status];
  const variants: Record<string, any> = {
    neutral: "secondary",
    info: "outline",
    success: "success",
    warning: "warning",
    error: "destructive",
  };

  return (
    <Badge variant={variants[tone] || "outline"} className="whitespace-nowrap">
      {FEEDBACK_STATUS_LABEL[status]}
    </Badge>
  );
}

export function FeedbackTypeLabel({ type }: { type: FeedbackType }) {
  return (
    <span className="text-sm font-medium text-foreground">
      {FEEDBACK_TYPE_LABEL[type]}
    </span>
  );
}

export function FeedbackSourceBadge({ source }: { source: FeedbackSource }) {
  return (
    <Badge variant="outline" className="whitespace-nowrap font-normal text-muted-foreground">
      {FEEDBACK_SOURCE_LABEL[source]}
    </Badge>
  );
}

export function FeedbackValueLabel({ value }: { value: FeedbackPerceivedValue }) {
  const colors: Record<FeedbackPerceivedValue, string> = {
    very_low: "text-red-500",
    low: "text-orange-500",
    medium: "text-yellow-600",
    high: "text-green-500",
    very_high: "text-emerald-600 font-bold",
    not_informed: "text-muted-foreground",
  };

  return (
    <span className={`text-sm ${colors[value]}`}>
      {FEEDBACK_VALUE_LABEL[value]}
    </span>
  );
}

export function FeedbackInterestLabel({ interest }: { interest: FeedbackSubscriptionInterest }) {
  const colors: Record<FeedbackSubscriptionInterest, string> = {
    no: "text-red-500",
    maybe: "text-yellow-600",
    yes: "text-green-500 font-medium",
    already_subscribed: "text-primary font-medium",
    not_informed: "text-muted-foreground",
  };

  return (
    <span className={`text-sm ${colors[interest]}`}>
      {FEEDBACK_INTEREST_LABEL[interest]}
    </span>
  );
}
