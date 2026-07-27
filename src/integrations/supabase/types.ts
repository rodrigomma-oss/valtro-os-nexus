export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      briefing_responses: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step: number
          data: Json
          id: string
          lead_id: string
          started_at: string | null
          template_type: Database["public"]["Enums"]["template_type"]
          token_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step?: number
          data?: Json
          id?: string
          lead_id: string
          started_at?: string | null
          template_type: Database["public"]["Enums"]["template_type"]
          token_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step?: number
          data?: Json
          id?: string
          lead_id?: string
          started_at?: string | null
          template_type?: Database["public"]["Enums"]["template_type"]
          token_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefing_responses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "briefing_responses_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "briefing_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      briefing_tokens: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          last_access_at: string | null
          lead_id: string
          revoked_at: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["token_status"]
          template_type: Database["public"]["Enums"]["template_type"]
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          last_access_at?: string | null
          lead_id: string
          revoked_at?: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["token_status"]
          template_type: Database["public"]["Enums"]["template_type"]
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          last_access_at?: string | null
          lead_id?: string
          revoked_at?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["token_status"]
          template_type?: Database["public"]["Enums"]["template_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefing_tokens_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_integrations: {
        Row: {
          access_token_ciphertext: string | null
          access_token_expires_at: string | null
          calendar_id: string | null
          calendar_owner_id: string | null
          calendar_scope: Database["public"]["Enums"]["calendar_scope"]
          calendar_summary: string | null
          connected_at: string | null
          connected_by: string | null
          created_at: string
          disconnected_at: string | null
          google_account_email: string | null
          granted_scopes: string | null
          id: string
          last_cron_result: Json | null
          last_cron_run_at: string | null
          last_error: string | null
          provider: string
          refresh_token_ciphertext: string | null
          status: Database["public"]["Enums"]["calendar_integration_status"]
          updated_at: string
          worker_running_until: string | null
        }
        Insert: {
          access_token_ciphertext?: string | null
          access_token_expires_at?: string | null
          calendar_id?: string | null
          calendar_owner_id?: string | null
          calendar_scope?: Database["public"]["Enums"]["calendar_scope"]
          calendar_summary?: string | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string
          disconnected_at?: string | null
          google_account_email?: string | null
          granted_scopes?: string | null
          id?: string
          last_cron_result?: Json | null
          last_cron_run_at?: string | null
          last_error?: string | null
          provider?: string
          refresh_token_ciphertext?: string | null
          status?: Database["public"]["Enums"]["calendar_integration_status"]
          updated_at?: string
          worker_running_until?: string | null
        }
        Update: {
          access_token_ciphertext?: string | null
          access_token_expires_at?: string | null
          calendar_id?: string | null
          calendar_owner_id?: string | null
          calendar_scope?: Database["public"]["Enums"]["calendar_scope"]
          calendar_summary?: string | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string
          disconnected_at?: string | null
          google_account_email?: string | null
          granted_scopes?: string | null
          id?: string
          last_cron_result?: Json | null
          last_cron_run_at?: string | null
          last_error?: string | null
          provider?: string
          refresh_token_ciphertext?: string | null
          status?: Database["public"]["Enums"]["calendar_integration_status"]
          updated_at?: string
          worker_running_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_integrations_calendar_owner_id_fkey"
            columns: ["calendar_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_integrations_connected_by_fkey"
            columns: ["connected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_oauth_states: {
        Row: {
          consumed_at: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          nonce: string
          redirect_uri: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          nonce: string
          redirect_uri: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          nonce?: string
          redirect_uri?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_oauth_states_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_sync_links: {
        Row: {
          calendar_id: string | null
          calendar_owner_id: string | null
          calendar_scope: Database["public"]["Enums"]["calendar_scope"]
          created_at: string
          entity_id: string
          entity_type: string
          external_event_id: string | null
          external_html_link: string | null
          id: string
          last_attempt_at: string | null
          last_error: string | null
          last_synced_at: string | null
          next_attempt_at: string
          payload_hash: string | null
          provider: string
          sync_attempts: number
          sync_status: Database["public"]["Enums"]["calendar_sync_status"]
          updated_at: string
        }
        Insert: {
          calendar_id?: string | null
          calendar_owner_id?: string | null
          calendar_scope?: Database["public"]["Enums"]["calendar_scope"]
          created_at?: string
          entity_id: string
          entity_type?: string
          external_event_id?: string | null
          external_html_link?: string | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_synced_at?: string | null
          next_attempt_at?: string
          payload_hash?: string | null
          provider?: string
          sync_attempts?: number
          sync_status?: Database["public"]["Enums"]["calendar_sync_status"]
          updated_at?: string
        }
        Update: {
          calendar_id?: string | null
          calendar_owner_id?: string | null
          calendar_scope?: Database["public"]["Enums"]["calendar_scope"]
          created_at?: string
          entity_id?: string
          entity_type?: string
          external_event_id?: string | null
          external_html_link?: string | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_synced_at?: string | null
          next_attempt_at?: string
          payload_hash?: string | null
          provider?: string
          sync_attempts?: number
          sync_status?: Database["public"]["Enums"]["calendar_sync_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_links_calendar_owner_id_fkey"
            columns: ["calendar_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_service_cycles: {
        Row: {
          amount_cents: number
          cancelled_at: string | null
          client_service_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          paid_amount_cents: number | null
          paid_at: string | null
          payment_method: string | null
          payment_notes: string | null
          payment_registered_by: string | null
          payment_status: Database["public"]["Enums"]["cycle_payment_status"]
          period_end: string
          period_start: string
          sequence: number
          started_at: string | null
          status: Database["public"]["Enums"]["client_service_cycle_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          cancelled_at?: string | null
          client_service_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          paid_amount_cents?: number | null
          paid_at?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_registered_by?: string | null
          payment_status?: Database["public"]["Enums"]["cycle_payment_status"]
          period_end: string
          period_start: string
          sequence: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["client_service_cycle_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          cancelled_at?: string | null
          client_service_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          paid_amount_cents?: number | null
          paid_at?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_registered_by?: string | null
          payment_status?: Database["public"]["Enums"]["cycle_payment_status"]
          period_end?: string
          period_start?: string
          sequence?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["client_service_cycle_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_service_cycles_client_service_id_fkey"
            columns: ["client_service_id"]
            isOneToOne: false
            referencedRelation: "client_services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_service_events: {
        Row: {
          actor_id: string | null
          client_service_id: string
          created_at: string
          description: string | null
          event_type: Database["public"]["Enums"]["client_service_event_type"]
          id: string
          metadata: Json
          title: string
        }
        Insert: {
          actor_id?: string | null
          client_service_id: string
          created_at?: string
          description?: string | null
          event_type: Database["public"]["Enums"]["client_service_event_type"]
          id?: string
          metadata?: Json
          title: string
        }
        Update: {
          actor_id?: string | null
          client_service_id?: string
          created_at?: string
          description?: string | null
          event_type?: Database["public"]["Enums"]["client_service_event_type"]
          id?: string
          metadata?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_service_events_client_service_id_fkey"
            columns: ["client_service_id"]
            isOneToOne: false
            referencedRelation: "client_services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_service_onboardings: {
        Row: {
          client_service_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_at: string | null
          id: string
          owner_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["onboarding_status"]
          template_key: string
          updated_at: string
        }
        Insert: {
          client_service_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          owner_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["onboarding_status"]
          template_key: string
          updated_at?: string
        }
        Update: {
          client_service_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          owner_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["onboarding_status"]
          template_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_service_onboardings_client_service_id_fkey"
            columns: ["client_service_id"]
            isOneToOne: false
            referencedRelation: "client_services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_services: {
        Row: {
          billing_interval_snapshot:
            | Database["public"]["Enums"]["billing_interval"]
            | null
          billing_type_snapshot: Database["public"]["Enums"]["service_billing_type"]
          cancelled_at: string | null
          client_id: string
          completed_at: string | null
          contracted_amount_cents: number
          contracted_at: string
          created_at: string
          created_by: string | null
          description_snapshot: string | null
          id: string
          name_snapshot: string
          owner_id: string | null
          proposal_id: string | null
          proposal_item_id: string | null
          quantity: number
          scope_snapshot: Json
          service_code_snapshot: string | null
          service_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["client_service_status"]
          unit_price_cents: number
          updated_at: string
        }
        Insert: {
          billing_interval_snapshot?:
            | Database["public"]["Enums"]["billing_interval"]
            | null
          billing_type_snapshot?: Database["public"]["Enums"]["service_billing_type"]
          cancelled_at?: string | null
          client_id: string
          completed_at?: string | null
          contracted_amount_cents?: number
          contracted_at?: string
          created_at?: string
          created_by?: string | null
          description_snapshot?: string | null
          id?: string
          name_snapshot: string
          owner_id?: string | null
          proposal_id?: string | null
          proposal_item_id?: string | null
          quantity?: number
          scope_snapshot?: Json
          service_code_snapshot?: string | null
          service_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["client_service_status"]
          unit_price_cents?: number
          updated_at?: string
        }
        Update: {
          billing_interval_snapshot?:
            | Database["public"]["Enums"]["billing_interval"]
            | null
          billing_type_snapshot?: Database["public"]["Enums"]["service_billing_type"]
          cancelled_at?: string | null
          client_id?: string
          completed_at?: string | null
          contracted_amount_cents?: number
          contracted_at?: string
          created_at?: string
          created_by?: string | null
          description_snapshot?: string | null
          id?: string
          name_snapshot?: string
          owner_id?: string | null
          proposal_id?: string | null
          proposal_item_id?: string | null
          quantity?: number
          scope_snapshot?: Json
          service_code_snapshot?: string | null
          service_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["client_service_status"]
          unit_price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_services_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_services_proposal_item_id_fkey"
            columns: ["proposal_item_id"]
            isOneToOne: false
            referencedRelation: "proposal_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          archived_at: string | null
          city: string | null
          company_name: string
          contact_name: string
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          lead_id: string | null
          notes: string | null
          owner_id: string | null
          phone: string | null
          segment: string | null
          state: string | null
          status: Database["public"]["Enums"]["client_status"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          city?: string | null
          company_name: string
          contact_name: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          segment?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          city?: string | null
          company_name?: string
          contact_name?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          segment?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number
          id: string
          lead_id: string
          outcome_notes: string | null
          owner_id: string | null
          reason: string | null
          rescheduled_from: string | null
          rescheduled_to: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["follow_up_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          lead_id: string
          outcome_notes?: string | null
          owner_id?: string | null
          reason?: string | null
          rescheduled_from?: string | null
          rescheduled_to?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["follow_up_status"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          lead_id?: string
          outcome_notes?: string | null
          owner_id?: string | null
          reason?: string | null
          rescheduled_from?: string | null
          rescheduled_to?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["follow_up_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_rescheduled_from_fkey"
            columns: ["rescheduled_from"]
            isOneToOne: false
            referencedRelation: "follow_ups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_rescheduled_to_fkey"
            columns: ["rescheduled_to"]
            isOneToOne: false
            referencedRelation: "follow_ups"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_contacts: {
        Row: {
          channel: Database["public"]["Enums"]["lead_contact_channel"]
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          notes: string | null
          result: Database["public"]["Enums"]["lead_contact_result"]
          type: Database["public"]["Enums"]["lead_contact_type"]
          updated_at: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["lead_contact_channel"]
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          result?: Database["public"]["Enums"]["lead_contact_result"]
          type: Database["public"]["Enums"]["lead_contact_type"]
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["lead_contact_channel"]
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          result?: Database["public"]["Enums"]["lead_contact_result"]
          type?: Database["public"]["Enums"]["lead_contact_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_contacts_created_by_profile_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          lead_id: string
          metadata: Json
          type: Database["public"]["Enums"]["lead_event_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          lead_id: string
          metadata?: Json
          type: Database["public"]["Enums"]["lead_event_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          lead_id?: string
          metadata?: Json
          type?: Database["public"]["Enums"]["lead_event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_created_by_profile_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_field_conflicts: {
        Row: {
          briefing_token_id: string | null
          briefing_value: string
          created_at: string
          current_value: string | null
          field: string
          id: string
          lead_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["lead_field_conflict_status"]
          updated_at: string
        }
        Insert: {
          briefing_token_id?: string | null
          briefing_value: string
          created_at?: string
          current_value?: string | null
          field: string
          id?: string
          lead_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["lead_field_conflict_status"]
          updated_at?: string
        }
        Update: {
          briefing_token_id?: string | null
          briefing_value?: string
          created_at?: string
          current_value?: string | null
          field?: string
          id?: string
          lead_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["lead_field_conflict_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_field_conflicts_briefing_token_id_fkey"
            columns: ["briefing_token_id"]
            isOneToOne: false
            referencedRelation: "briefing_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_field_conflicts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_created_by_profile_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          archived_at: string | null
          city: string | null
          client_id: string | null
          company_name: string
          contact_name: string
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          instagram: string | null
          next_action: string | null
          next_follow_up_at: string | null
          next_follow_up_owner_id: string | null
          next_follow_up_reason: string | null
          owner_id: string | null
          phone: string | null
          segment: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          source: Database["public"]["Enums"]["lead_source"]
          state: string | null
          status: Database["public"]["Enums"]["lead_status"]
          triage_notes: string | null
          triage_started_at: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          city?: string | null
          client_id?: string | null
          company_name: string
          contact_name: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          next_action?: string | null
          next_follow_up_at?: string | null
          next_follow_up_owner_id?: string | null
          next_follow_up_reason?: string | null
          owner_id?: string | null
          phone?: string | null
          segment?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          source?: Database["public"]["Enums"]["lead_source"]
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          triage_notes?: string | null
          triage_started_at?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          city?: string | null
          client_id?: string | null
          company_name?: string
          contact_name?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          next_action?: string | null
          next_follow_up_at?: string | null
          next_follow_up_owner_id?: string | null
          next_follow_up_reason?: string | null
          owner_id?: string | null
          phone?: string | null
          segment?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          source?: Database["public"]["Enums"]["lead_source"]
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          triage_notes?: string | null
          triage_started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_owner_id_profile_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_responses: {
        Row: {
          client_service_onboarding_id: string
          completed_at: string | null
          created_at: string
          current_step: number
          data: Json
          id: string
          started_at: string | null
          template_key: string
          token_id: string
          updated_at: string
        }
        Insert: {
          client_service_onboarding_id: string
          completed_at?: string | null
          created_at?: string
          current_step?: number
          data?: Json
          id?: string
          started_at?: string | null
          template_key: string
          token_id: string
          updated_at?: string
        }
        Update: {
          client_service_onboarding_id?: string
          completed_at?: string | null
          created_at?: string
          current_step?: number
          data?: Json
          id?: string
          started_at?: string | null
          template_key?: string
          token_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_responses_client_service_onboarding_id_fkey"
            columns: ["client_service_onboarding_id"]
            isOneToOne: false
            referencedRelation: "client_service_onboardings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_responses_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "onboarding_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_tokens: {
        Row: {
          client_service_onboarding_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          last_access_at: string | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["token_status"]
          updated_at: string
        }
        Insert: {
          client_service_onboarding_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          last_access_at?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["token_status"]
          updated_at?: string
        }
        Update: {
          client_service_onboarding_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          last_access_at?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["token_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tokens_client_service_onboarding_id_fkey"
            columns: ["client_service_onboarding_id"]
            isOneToOne: false
            referencedRelation: "client_service_onboardings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          metadata: Json | null
          project_id: string
          type: Database["public"]["Enums"]["project_event_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          project_id: string
          type: Database["public"]["Enums"]["project_event_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string
          type?: Database["public"]["Enums"]["project_event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "project_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string
          code: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          name: string
          owner_id: string | null
          proposal_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          client_id: string
          code?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          owner_id?: string | null
          proposal_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          code?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          proposal_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          position: number
          proposal_id: string
          quantity: number
          service_id: string | null
          service_key: string | null
          service_label: string
          subtotal: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          proposal_id: string
          quantity?: number
          service_id?: string | null
          service_key?: string | null
          service_label: string
          subtotal?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          proposal_id?: string
          quantity?: number
          service_id?: string | null
          service_key?: string | null
          service_label?: string
          subtotal?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_negotiations: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          metadata: Json | null
          proposal_id: string
          type: Database["public"]["Enums"]["proposal_negotiation_type"]
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          proposal_id: string
          type: Database["public"]["Enums"]["proposal_negotiation_type"]
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          proposal_id?: string
          type?: Database["public"]["Enums"]["proposal_negotiation_type"]
        }
        Relationships: [
          {
            foreignKeyName: "proposal_negotiations_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          created_at: string
          created_by: string | null
          discount_amount: number
          final_amount: number
          id: string
          internal_notes: string | null
          issued_at: string
          lead_id: string
          number: string
          owner_id: string | null
          snapshot_json: Json | null
          status: Database["public"]["Enums"]["proposal_status"]
          title: string
          total_amount: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          final_amount?: number
          id?: string
          internal_notes?: string | null
          issued_at?: string
          lead_id: string
          number: string
          owner_id?: string | null
          snapshot_json?: Json | null
          status?: Database["public"]["Enums"]["proposal_status"]
          title: string
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          final_amount?: number
          id?: string
          internal_notes?: string | null
          issued_at?: string
          lead_id?: string
          number?: string
          owner_id?: string | null
          snapshot_json?: Json | null
          status?: Database["public"]["Enums"]["proposal_status"]
          title?: string
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          billing_interval:
            | Database["public"]["Enums"]["billing_interval"]
            | null
          billing_type: Database["public"]["Enums"]["service_billing_type"]
          briefing_template_key: string | null
          category: Database["public"]["Enums"]["service_type"]
          code: string
          created_at: string
          default_limits: Json
          default_price_cents: number | null
          description: string | null
          id: string
          name: string
          onboarding_template_key: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          billing_interval?:
            | Database["public"]["Enums"]["billing_interval"]
            | null
          billing_type?: Database["public"]["Enums"]["service_billing_type"]
          briefing_template_key?: string | null
          category?: Database["public"]["Enums"]["service_type"]
          code: string
          created_at?: string
          default_limits?: Json
          default_price_cents?: number | null
          description?: string | null
          id?: string
          name: string
          onboarding_template_key?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          billing_interval?:
            | Database["public"]["Enums"]["billing_interval"]
            | null
          billing_type?: Database["public"]["Enums"]["service_billing_type"]
          briefing_template_key?: string | null
          category?: Database["public"]["Enums"]["service_type"]
          code?: string
          created_at?: string
          default_limits?: Json
          default_price_cents?: number | null
          description?: string | null
          id?: string
          name?: string
          onboarding_template_key?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      client_service_transition_allowed: {
        Args: {
          _from: Database["public"]["Enums"]["client_service_status"]
          _to: Database["public"]["Enums"]["client_service_status"]
        }
        Returns: boolean
      }
      convert_lead_to_client: { Args: { _lead_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hydrate_onboarding_defaults: {
        Args: { _client_service_id: string }
        Returns: Json
      }
      set_calendar_cron_secret: { Args: { _value: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "operator" | "viewer"
      billing_interval: "monthly"
      calendar_integration_status: "conectado" | "desconectado" | "erro"
      calendar_scope: "empresa" | "usuario"
      calendar_sync_status: "pendente" | "sincronizado" | "falha" | "removido"
      client_service_cycle_status:
        | "previsto"
        | "ativo"
        | "concluido"
        | "cancelado"
      client_service_event_type:
        | "created"
        | "activated"
        | "paused"
        | "resumed"
        | "completed"
        | "cancelled"
        | "status_changed"
        | "note_added"
        | "onboarding_created"
        | "onboarding_sent"
        | "onboarding_started"
        | "onboarding_completed"
        | "onboarding_revoked"
        | "cycle_created"
        | "cycle_started"
        | "cycle_completed"
        | "cycle_cancelled"
        | "cycle_payment_registered"
      client_service_status:
        | "pendente"
        | "ativo"
        | "pausado"
        | "concluido"
        | "cancelado"
      client_status: "ativo" | "inativo" | "arquivado"
      cycle_payment_status: "pendente" | "pago" | "vencido" | "dispensado"
      follow_up_status: "agendado" | "concluido" | "cancelado" | "reagendado"
      lead_contact_channel:
        | "whatsapp"
        | "email"
        | "telefone"
        | "reuniao"
        | "outro"
      lead_contact_result:
        | "sem_resposta"
        | "respondido"
        | "interessado"
        | "nao_interessado"
        | "agendado"
        | "concluido"
      lead_contact_type:
        | "primeiro_contato"
        | "follow_up"
        | "envio_briefing"
        | "lembrete"
        | "apresentacao"
        | "proposta"
        | "outro"
      lead_event_type:
        | "lead_criado"
        | "status_alterado"
        | "observacao_adicionada"
        | "observacao_editada"
        | "observacao_removida"
        | "briefing_enviado"
        | "briefing_recebido"
        | "lead_arquivado"
        | "lead_atualizado"
        | "briefing_gerado"
        | "briefing_revogado"
        | "briefing_reenviado"
        | "briefing_iniciado"
        | "briefing_retomado"
        | "briefing_concluido"
        | "triagem_iniciada"
        | "proxima_acao_alterada"
        | "interesse_alterado"
        | "responsavel_alterado"
        | "oportunidade_descartada"
        | "oportunidade_convertida"
        | "contato_registrado"
        | "follow_up_agendado"
        | "follow_up_concluido"
        | "proposta_criada"
        | "proposta_status_alterado"
        | "proposta_aprovada"
        | "proposta_rejeitada"
        | "follow_up_reagendado"
        | "follow_up_cancelado"
        | "cadastro_atualizado_por_briefing"
        | "cadastro_conflito_por_briefing"
      lead_field_conflict_status: "pendente" | "aceito" | "descartado"
      lead_source:
        | "instagram"
        | "indicacao"
        | "site"
        | "google"
        | "evento"
        | "outbound"
        | "diagnostico"
        | "manual"
      lead_status:
        | "novo"
        | "contato"
        | "qualificado"
        | "proposta"
        | "ganho"
        | "perdido"
        | "em_triagem"
        | "aguardando_briefing"
        | "briefing_enviado"
        | "em_analise"
        | "descartado"
      onboarding_status:
        | "pendente"
        | "enviado"
        | "em_preenchimento"
        | "concluido"
        | "cancelado"
      project_event_type:
        | "projeto_criado"
        | "status_alterado"
        | "responsavel_alterado"
        | "datas_alteradas"
        | "observacao_adicionada"
        | "projeto_concluido"
        | "projeto_cancelado"
        | "vinculo_proposta"
        | "cliente_atualizado"
      project_status:
        | "nao_iniciado"
        | "planejamento"
        | "em_desenvolvimento"
        | "em_revisao"
        | "aguardando_cliente"
        | "concluido"
        | "cancelado"
      proposal_negotiation_type:
        | "contraproposta"
        | "desconto"
        | "alteracao"
        | "observacao"
      proposal_status:
        | "rascunho"
        | "em_elaboracao"
        | "enviada"
        | "em_negociacao"
        | "aprovada"
        | "rejeitada"
        | "expirada"
        | "cancelada"
      service_billing_type: "pontual" | "recorrente"
      service_type:
        | "nao_definido"
        | "gestao_shopee"
        | "gestao_mercadolivre"
        | "gestao_amazon"
        | "gestao_multicanal"
        | "consultoria"
        | "diagnostico"
        | "trafego_pago"
        | "outro"
        | "desenvolvimento_projeto"
      template_type:
        | "padrao"
        | "shopee"
        | "mercadolivre"
        | "amazon"
        | "multicanal"
        | "consultoria"
        | "diagnostico"
        | "custom"
      token_status: "pendente" | "ativo" | "concluido" | "expirado" | "revogado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "operator", "viewer"],
      billing_interval: ["monthly"],
      calendar_integration_status: ["conectado", "desconectado", "erro"],
      calendar_scope: ["empresa", "usuario"],
      calendar_sync_status: ["pendente", "sincronizado", "falha", "removido"],
      client_service_cycle_status: [
        "previsto",
        "ativo",
        "concluido",
        "cancelado",
      ],
      client_service_event_type: [
        "created",
        "activated",
        "paused",
        "resumed",
        "completed",
        "cancelled",
        "status_changed",
        "note_added",
        "onboarding_created",
        "onboarding_sent",
        "onboarding_started",
        "onboarding_completed",
        "onboarding_revoked",
        "cycle_created",
        "cycle_started",
        "cycle_completed",
        "cycle_cancelled",
        "cycle_payment_registered",
      ],
      client_service_status: [
        "pendente",
        "ativo",
        "pausado",
        "concluido",
        "cancelado",
      ],
      client_status: ["ativo", "inativo", "arquivado"],
      cycle_payment_status: ["pendente", "pago", "vencido", "dispensado"],
      follow_up_status: ["agendado", "concluido", "cancelado", "reagendado"],
      lead_contact_channel: [
        "whatsapp",
        "email",
        "telefone",
        "reuniao",
        "outro",
      ],
      lead_contact_result: [
        "sem_resposta",
        "respondido",
        "interessado",
        "nao_interessado",
        "agendado",
        "concluido",
      ],
      lead_contact_type: [
        "primeiro_contato",
        "follow_up",
        "envio_briefing",
        "lembrete",
        "apresentacao",
        "proposta",
        "outro",
      ],
      lead_event_type: [
        "lead_criado",
        "status_alterado",
        "observacao_adicionada",
        "observacao_editada",
        "observacao_removida",
        "briefing_enviado",
        "briefing_recebido",
        "lead_arquivado",
        "lead_atualizado",
        "briefing_gerado",
        "briefing_revogado",
        "briefing_reenviado",
        "briefing_iniciado",
        "briefing_retomado",
        "briefing_concluido",
        "triagem_iniciada",
        "proxima_acao_alterada",
        "interesse_alterado",
        "responsavel_alterado",
        "oportunidade_descartada",
        "oportunidade_convertida",
        "contato_registrado",
        "follow_up_agendado",
        "follow_up_concluido",
        "proposta_criada",
        "proposta_status_alterado",
        "proposta_aprovada",
        "proposta_rejeitada",
        "follow_up_reagendado",
        "follow_up_cancelado",
        "cadastro_atualizado_por_briefing",
        "cadastro_conflito_por_briefing",
      ],
      lead_field_conflict_status: ["pendente", "aceito", "descartado"],
      lead_source: [
        "instagram",
        "indicacao",
        "site",
        "google",
        "evento",
        "outbound",
        "diagnostico",
        "manual",
      ],
      lead_status: [
        "novo",
        "contato",
        "qualificado",
        "proposta",
        "ganho",
        "perdido",
        "em_triagem",
        "aguardando_briefing",
        "briefing_enviado",
        "em_analise",
        "descartado",
      ],
      onboarding_status: [
        "pendente",
        "enviado",
        "em_preenchimento",
        "concluido",
        "cancelado",
      ],
      project_event_type: [
        "projeto_criado",
        "status_alterado",
        "responsavel_alterado",
        "datas_alteradas",
        "observacao_adicionada",
        "projeto_concluido",
        "projeto_cancelado",
        "vinculo_proposta",
        "cliente_atualizado",
      ],
      project_status: [
        "nao_iniciado",
        "planejamento",
        "em_desenvolvimento",
        "em_revisao",
        "aguardando_cliente",
        "concluido",
        "cancelado",
      ],
      proposal_negotiation_type: [
        "contraproposta",
        "desconto",
        "alteracao",
        "observacao",
      ],
      proposal_status: [
        "rascunho",
        "em_elaboracao",
        "enviada",
        "em_negociacao",
        "aprovada",
        "rejeitada",
        "expirada",
        "cancelada",
      ],
      service_billing_type: ["pontual", "recorrente"],
      service_type: [
        "nao_definido",
        "gestao_shopee",
        "gestao_mercadolivre",
        "gestao_amazon",
        "gestao_multicanal",
        "consultoria",
        "diagnostico",
        "trafego_pago",
        "outro",
        "desenvolvimento_projeto",
      ],
      template_type: [
        "padrao",
        "shopee",
        "mercadolivre",
        "amazon",
        "multicanal",
        "consultoria",
        "diagnostico",
        "custom",
      ],
      token_status: ["pendente", "ativo", "concluido", "expirado", "revogado"],
    },
  },
} as const
