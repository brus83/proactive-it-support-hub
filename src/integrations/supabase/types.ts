export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      ad_assets: {
        Row: {
          ad_sync_date: string | null
          additional_info: Json | null
          computer_name: string | null
          department: string | null
          id: string
          ip_address: string | null
          last_login: string | null
          location: string | null
          os_version: string | null
          user_id: string | null
        }
        Insert: {
          ad_sync_date?: string | null
          additional_info?: Json | null
          computer_name?: string | null
          department?: string | null
          id?: string
          ip_address?: string | null
          last_login?: string | null
          location?: string | null
          os_version?: string | null
          user_id?: string | null
        }
        Update: {
          ad_sync_date?: string | null
          additional_info?: Json | null
          computer_name?: string | null
          department?: string | null
          id?: string
          ip_address?: string | null
          last_login?: string | null
          location?: string | null
          os_version?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_assets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_responses: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          priority: number
          response_template: string
          trigger_categories: string[] | null
          trigger_keywords: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          response_template: string
          trigger_categories?: string[] | null
          trigger_keywords?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          response_template?: string
          trigger_categories?: string[] | null
          trigger_keywords?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          action_details: Json | null
          action_type: string
          error_message: string | null
          id: string
          success: boolean
          ticket_id: string | null
          triggered_at: string
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          error_message?: string | null
          id?: string
          success?: boolean
          ticket_id?: string | null
          triggered_at?: string
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          error_message?: string | null
          id?: string
          success?: boolean
          ticket_id?: string | null
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      chatbot_responses: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          keywords: string[]
          question: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          keywords?: string[]
          question: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          keywords?: string[]
          question?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          ticket_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          ticket_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          ticket_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          subject: string
          template_type: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          subject: string
          template_type: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      escalation_rules: {
        Row: {
          created_at: string
          escalate_to_role: string
          id: string
          is_active: boolean
          name: string
          notification_template_id: string | null
          priority: string
          time_threshold_hours: number
        }
        Insert: {
          created_at?: string
          escalate_to_role: string
          id?: string
          is_active?: boolean
          name: string
          notification_template_id?: string | null
          priority: string
          time_threshold_hours: number
        }
        Update: {
          created_at?: string
          escalate_to_role?: string
          id?: string
          is_active?: boolean
          name?: string
          notification_template_id?: string | null
          priority?: string
          time_threshold_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "escalation_rules_notification_template_id_fkey"
            columns: ["notification_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          category_id: string | null
          content: string
          created_at: string
          id: string
          is_published: boolean
          keywords: string[] | null
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          category_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_published?: boolean
          keywords?: string[] | null
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          category_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          keywords?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string
          deadline_email: boolean
          deadline_in_app: boolean
          email_frequency: string
          escalation_email: boolean
          escalation_in_app: boolean
          id: string
          new_ticket_email: boolean
          new_ticket_in_app: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          reminder_email: boolean
          reminder_in_app: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deadline_email?: boolean
          deadline_in_app?: boolean
          email_frequency?: string
          escalation_email?: boolean
          escalation_in_app?: boolean
          id?: string
          new_ticket_email?: boolean
          new_ticket_in_app?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reminder_email?: boolean
          reminder_in_app?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deadline_email?: boolean
          deadline_in_app?: boolean
          email_frequency?: string
          escalation_email?: boolean
          escalation_in_app?: boolean
          id?: string
          new_ticket_email?: boolean
          new_ticket_in_app?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reminder_email?: boolean
          reminder_in_app?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          category: string
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string
          read_at: string | null
          ticket_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message: string
          read_at?: string | null
          ticket_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string
          read_at?: string | null
          ticket_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          department: string | null
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      scheduled_interventions: {
        Row: {
          created_at: string
          id: string
          intervention_type: string
          notes: string | null
          scheduled_end: string
          scheduled_start: string
          status: string
          technician_id: string | null
          ticket_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          intervention_type: string
          notes?: string | null
          scheduled_end: string
          scheduled_start: string
          status?: string
          technician_id?: string | null
          ticket_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          intervention_type?: string
          notes?: string | null
          scheduled_end?: string
          scheduled_start?: string
          status?: string
          technician_id?: string | null
          ticket_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_interventions_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_interventions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      store_locations: {
        Row: {
          additional_info: Json | null
          address: string | null
          city: string | null
          created_at: string
          id: string
          ip_range: string
          is_active: boolean
          store_code: string | null
          store_name: string
          updated_at: string
        }
        Insert: {
          additional_info?: Json | null
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          ip_range: string
          is_active?: boolean
          store_code?: string | null
          store_name: string
          updated_at?: string
        }
        Update: {
          additional_info?: Json | null
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          ip_range?: string
          is_active?: boolean
          store_code?: string | null
          store_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ticket_attachments: {
        Row: {
          created_at: string
          download_count: number
          file_name: string
          file_path: string
          file_size: number
          id: string
          is_public: boolean
          metadata: Json | null
          mime_type: string
          ticket_id: string
          updated_at: string
          uploaded_by: string | null
          virus_scan_status: string
        }
        Insert: {
          created_at?: string
          download_count?: number
          file_name: string
          file_path: string
          file_size: number
          id?: string
          is_public?: boolean
          metadata?: Json | null
          mime_type: string
          ticket_id: string
          updated_at?: string
          uploaded_by?: string | null
          virus_scan_status?: string
        }
        Update: {
          created_at?: string
          download_count?: number
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          is_public?: boolean
          metadata?: Json | null
          mime_type?: string
          ticket_id?: string
          updated_at?: string
          uploaded_by?: string | null
          virus_scan_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_reminders: {
        Row: {
          created_at: string
          id: string
          is_sent: boolean
          message: string | null
          reminder_type: string
          scheduled_at: string
          sent_at: string | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_sent?: boolean
          message?: string | null
          reminder_type: string
          scheduled_at: string
          sent_at?: string | null
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_sent?: boolean
          message?: string | null
          reminder_type?: string
          scheduled_at?: string
          sent_at?: string | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_reminders_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          ai_analysis: Json | null
          assigned_to: string | null
          auto_assigned: boolean | null
          category_id: string | null
          channel: string | null
          closed_at: string | null
          contact_name: string | null
          created_at: string | null
          department: string | null
          description: string
          escalation_count: number | null
          id: string
          kb_suggestions: Json | null
          last_escalation_at: string | null
          owner: string | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolution_notes: string | null
          resolved_at: string | null
          response_sent: boolean | null
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_type: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          assigned_to?: string | null
          auto_assigned?: boolean | null
          category_id?: string | null
          channel?: string | null
          closed_at?: string | null
          contact_name?: string | null
          created_at?: string | null
          department?: string | null
          description: string
          escalation_count?: number | null
          id?: string
          kb_suggestions?: Json | null
          last_escalation_at?: string | null
          owner?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolution_notes?: string | null
          resolved_at?: string | null
          response_sent?: boolean | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_type?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          assigned_to?: string | null
          auto_assigned?: boolean | null
          category_id?: string | null
          channel?: string | null
          closed_at?: string | null
          contact_name?: string | null
          created_at?: string | null
          department?: string | null
          description?: string
          escalation_count?: number | null
          id?: string
          kb_suggestions?: Json | null
          last_escalation_at?: string | null
          owner?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolution_notes?: string | null
          resolved_at?: string | null
          response_sent?: boolean | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_type?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          assigned_to: string | null
          created_at: string
          current_step: number
          data: Json | null
          id: string
          status: string
          ticket_id: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          current_step?: number
          data?: Json | null
          id?: string
          status?: string
          ticket_id: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          current_step?: number
          data?: Json | null
          id?: string
          status?: string
          ticket_id?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          notes: string | null
          step_number: number
          user_id: string | null
          workflow_execution_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          notes?: string | null
          step_number: number
          user_id?: string | null
          workflow_execution_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          notes?: string | null
          step_number?: number
          user_id?: string | null
          workflow_execution_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_logs_workflow_execution_id_fkey"
            columns: ["workflow_execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          steps: Json
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          steps?: Json
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          steps?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_assign_ticket: {
        Args: { ticket_id: string; category_name: string }
        Returns: string
      }
      create_notification: {
        Args: {
          _user_id: string
          _title: string
          _message: string
          _type?: string
          _category?: string
          _ticket_id?: string
          _data?: Json
        }
        Returns: string
      }
      get_store_suggestions: {
        Args: { search_text: string }
        Returns: {
          id: string
          store_code: string
          store_name: string
          ip_range: string
          address: string
          city: string
          is_active: boolean
          relevance_score: number
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      increment_download_count: {
        Args: { attachment_id: string }
        Returns: undefined
      }
      is_admin_or_tech: {
        Args: { _user_id: string }
        Returns: boolean
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
    }
    Enums: {
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      user_role: "admin" | "technician" | "user"
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
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      user_role: ["admin", "technician", "user"],
    },
  },
} as const
