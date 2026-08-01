export type BugStatus =
  | "new"
  | "triage"
  | "confirmed"
  | "in_progress"
  | "in_testing"
  | "fixed"
  | "closed"
  | "rejected";

export type BugSeverity = "low" | "normal" | "high" | "critical" | "blocker";

export type BugCategory =
  | "ui_ux"
  | "backend"
  | "frontend"
  | "security"
  | "performance"
  | "localization"
  | "data_integrity"
  | "other";

export type BugEnvironment = "production" | "staging" | "development" | "local";

export type BugEventType =
  | "created"
  | "status_changed"
  | "severity_changed"
  | "category_changed"
  | "owner_changed"
  | "affected_version_changed"
  | "fixed_version_changed"
  | "request_id_changed"
  | "linked_to_ticket"
  | "assigned"
  | "fixed"
  | "confirmed"
  | "reopened"
  | "rejected"
  | "commented"
  | "closed";

export interface Bug {
  id: string;
  code: string;
  title: string;
  description: string;
  saas_product_id: string;
  ticket_id: string | null;
  reported_by: string;
  owner_id: string | null;
  status: BugStatus;
  severity: BugSeverity;
  category: BugCategory;
  environment: BugEnvironment;
  affected_version: string | null;
  fixed_version: string | null;
  request_id: string | null;
  external_reference: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  fixed_at: string | null;
  closed_at: string | null;
  // Hydrated fields
  product_name?: string | null;
  reported_by_name?: string | null;
  owner_name?: string | null;
}

export interface BugEvent {
  id: string;
  bug_id: string;
  type: BugEventType;
  description: string | null;
  metadata: Record<string, any>;
  created_by: string | null;
  created_at: string;
  // Hydrated fields
  created_by_name?: string | null;
}
