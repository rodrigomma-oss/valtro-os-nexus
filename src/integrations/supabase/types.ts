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
      convert_lead_to_client: { Args: { _lead_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operator" | "viewer"
      client_status: "ativo" | "inativo" | "arquivado"
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
      client_status: ["ativo", "inativo", "arquivado"],
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
      ],
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
