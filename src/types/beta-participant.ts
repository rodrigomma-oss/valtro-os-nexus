/** Gestão dos Participantes do Beta (VOS-001F) — tipos de domínio. */

export type BetaParticipantStatus =
  | "invited"
  | "accepted"
  | "active"
  | "inactive"
  | "removed"
  | "converted";

export type BetaParticipantInterest =
  | "no"
  | "maybe"
  | "yes"
  | "already_customer"
  | "unknown";

export type BetaParticipantEventType =
  | "created"
  | "invited"
  | "accepted"
  | "activated"
  | "deactivated"
  | "removed"
  | "converted"
  | "interest_changed"
  | "notes_changed"
  | "linked_user"
  | "reopened";

export interface BetaParticipant {
  id: string;
  code: string;
  beta_program_id: string;
  saas_product_id: string;
  user_id: string | null;
  email: string;
  name: string;
  status: BetaParticipantStatus;
  interest_to_subscribe: BetaParticipantInterest;
  invited_by: string | null;
  notes: string | null;
  accepted_at: string | null;
  activated_at: string | null;
  ended_at: string | null;
  converted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  /** Campos hidratados (nunca persistidos). */
  program_name?: string | null;
  program_code?: string | null;
  product_name?: string | null;
  invited_by_name?: string | null;
  linked_user_name?: string | null;
}

export interface BetaParticipantEvent {
  id: string;
  beta_participant_id: string;
  type: BetaParticipantEventType;
  description: string | null;
  metadata: Record<string, any> | null;
  created_by: string | null;
  created_at: string;
  created_by_name?: string | null;
}
