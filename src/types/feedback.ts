export type FeedbackType =
  | "praise"
  | "suggestion"
  | "complaint"
  | "question"
  | "usability"
  | "feature_request"
  | "pricing"
  | "other";

export type FeedbackSource =
  | "internal"
  | "beta_portal"
  | "support"
  | "interview"
  | "email"
  | "whatsapp"
  | "other";

export type FeedbackStatus =
  | "new"
  | "under_review"
  | "accepted"
  | "planned"
  | "implemented"
  | "dismissed"
  | "closed";

export type FeedbackPerceivedValue =
  | "very_low"
  | "low"
  | "medium"
  | "high"
  | "very_high"
  | "not_informed";

export type FeedbackSubscriptionInterest = "no" | "maybe" | "yes" | "already_subscribed" | "not_informed";

export type FeedbackEventType =
  | "created"
  | "status_changed"
  | "type_changed"
  | "owner_changed"
  | "perceived_value_changed"
  | "subscription_interest_changed"
  | "desired_feature_changed"
  | "linked_to_ticket"
  | "linked_to_bug"
  | "accepted"
  | "planned"
  | "implemented"
  | "dismissed"
  | "closed"
  | "reopened";

export interface Feedback {
  id: string;
  code: string;
  saas_product_id: string;
  product_name?: string;
  title: string;
  description: string;
  type: FeedbackType;
  source: FeedbackSource;
  status: FeedbackStatus;
  perceived_value: FeedbackPerceivedValue;
  subscription_interest: FeedbackSubscriptionInterest;
  desired_feature: string | null;
  participant_name: string | null;
  participant_email: string | null;
  participant_user_id: string | null;
  ticket_id: string | null;
  ticket_protocol?: string | null;
  bug_id: string | null;
  bug_code?: string | null;
  owner_id: string | null;
  owner_name?: string | null;
  created_by: string | null; // Alterado de string para string | null para suportar origem API
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  closed_at: string | null;
}

export interface FeedbackEvent {
  id: string;
  feedback_id: string;
  event_type: FeedbackEventType;
  actor_id: string | null;
  actor_name?: string;
  metadata: any;
  created_at: string;
}
