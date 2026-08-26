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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_reconciliations: {
        Row: {
          account_id: string
          created_at: string
          created_by: string
          difference: number | null
          enc_version: number
          household_id: string
          id: string
          ledger_balance: number
          ledger_balance_enc: string | null
          notes: string | null
          statement_balance: number
          statement_balance_enc: string | null
          statement_date: string
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by: string
          difference?: number | null
          enc_version?: number
          household_id: string
          id?: string
          ledger_balance: number
          ledger_balance_enc?: string | null
          notes?: string | null
          statement_balance: number
          statement_balance_enc?: string | null
          statement_date: string
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string
          difference?: number | null
          enc_version?: number
          household_id?: string
          id?: string
          ledger_balance?: number
          ledger_balance_enc?: string | null
          notes?: string | null
          statement_balance?: number
          statement_balance_enc?: string | null
          statement_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_reconciliations_account_household_fkey"
            columns: ["account_id", "household_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "account_reconciliations_account_household_fkey"
            columns: ["account_id", "household_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "account_reconciliations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_reconciliations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          color: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          enc_version: number
          household_id: string
          icon: string | null
          id: string
          initial_balance: number
          initial_balance_enc: string | null
          is_archived: boolean
          name: string
          owner_profile_id: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          enc_version?: number
          household_id: string
          icon?: string | null
          id?: string
          initial_balance?: number
          initial_balance_enc?: string | null
          is_archived?: boolean
          name: string
          owner_profile_id?: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          enc_version?: number
          household_id?: string
          icon?: string | null
          id?: string
          initial_balance?: number
          initial_balance_enc?: string | null
          is_archived?: boolean
          name?: string
          owner_profile_id?: string | null
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_feedback: {
        Row: {
          app_context: Json
          app_version: string | null
          assigned_to: string | null
          category: string
          closed_at: string | null
          created_at: string
          description: string
          id: string
          idempotency_key: string
          last_activity_at: string
          platform: string | null
          priority: string
          resolved_at: string | null
          resolved_in_release_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          withdrawn_at: string | null
        }
        Insert: {
          app_context?: Json
          app_version?: string | null
          assigned_to?: string | null
          category: string
          closed_at?: string | null
          created_at?: string
          description: string
          id?: string
          idempotency_key: string
          last_activity_at?: string
          platform?: string | null
          priority?: string
          resolved_at?: string | null
          resolved_in_release_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          withdrawn_at?: string | null
        }
        Update: {
          app_context?: Json
          app_version?: string | null
          assigned_to?: string | null
          category?: string
          closed_at?: string | null
          created_at?: string
          description?: string
          id?: string
          idempotency_key?: string
          last_activity_at?: string
          platform?: string | null
          priority?: string
          resolved_at?: string | null
          resolved_in_release_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_feedback_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "platform_admins"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "app_feedback_resolved_in_release_id_fkey"
            columns: ["resolved_in_release_id"]
            isOneToOne: false
            referencedRelation: "app_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_notifications: {
        Row: {
          body: string
          created_at: string
          data: Json
          deleted_at: string | null
          household_id: string | null
          id: string
          native_push_dispatched_at: string | null
          push_dispatch_attempted_at: string | null
          push_dispatch_status: string
          push_dispatched_at: string | null
          read_at: string | null
          recipient_id: string
          source_key: string | null
          title: string
          type: string
          web_push_dispatched_at: string | null
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json
          deleted_at?: string | null
          household_id?: string | null
          id?: string
          native_push_dispatched_at?: string | null
          push_dispatch_attempted_at?: string | null
          push_dispatch_status?: string
          push_dispatched_at?: string | null
          read_at?: string | null
          recipient_id: string
          source_key?: string | null
          title: string
          type: string
          web_push_dispatched_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json
          deleted_at?: string | null
          household_id?: string | null
          id?: string
          native_push_dispatched_at?: string | null
          push_dispatch_attempted_at?: string | null
          push_dispatch_status?: string
          push_dispatched_at?: string | null
          read_at?: string | null
          recipient_id?: string
          source_key?: string | null
          title?: string
          type?: string
          web_push_dispatched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_notifications_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_releases: {
        Row: {
          build_number: string
          channel: string
          commit_sha: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          platform: string
          release_notes: string | null
          released_at: string | null
          status: string
          title: string | null
          updated_at: string
          version: string
        }
        Insert: {
          build_number?: string
          channel?: string
          commit_sha?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          platform?: string
          release_notes?: string | null
          released_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          version: string
        }
        Update: {
          build_number?: string
          channel?: string
          commit_sha?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          platform?: string
          release_notes?: string | null
          released_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_releases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          id: string
          mime_type: string
          storage_path: string
          transaction_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          id?: string
          mime_type: string
          storage_path: string
          transaction_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string
          storage_path?: string
          transaction_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          household_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          profile_id: string | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          created_at?: string
          household_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          profile_id?: string | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          created_at?: string
          household_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          profile_id?: string | null
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_configs: {
        Row: {
          created_at: string
          household_id: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_configs_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_rule_allocations: {
        Row: {
          amount: number
          amount_enc: string | null
          category_id: string | null
          created_at: string
          destination_account_id: string
          enc_version: number
          id: string
          rule_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount?: number
          amount_enc?: string | null
          category_id?: string | null
          created_at?: string
          destination_account_id: string
          enc_version?: number
          id?: string
          rule_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_enc?: string | null
          category_id?: string | null
          created_at?: string
          destination_account_id?: string
          enc_version?: number
          id?: string
          rule_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_rule_allocations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_rule_allocations_destination_account_id_fkey"
            columns: ["destination_account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_rule_allocations_destination_account_id_fkey"
            columns: ["destination_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_rule_allocations_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "budget_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_rules: {
        Row: {
          active_from_month: number | null
          active_months: number[]
          active_to_month: number | null
          allocation_mode: Database["public"]["Enums"]["budget_rule_allocation_mode"]
          amount: number
          amount_enc: string | null
          budget_config_id: string
          created_at: string
          deleted_at: string | null
          enc_version: number
          frequency: Database["public"]["Enums"]["recurring_frequency"]
          id: string
          is_active: boolean
          name: string
          owner_member_id: string | null
          priority: number
          section: Database["public"]["Enums"]["monthly_budget_section"]
          source_account_id: string
          updated_at: string
        }
        Insert: {
          active_from_month?: number | null
          active_months?: number[]
          active_to_month?: number | null
          allocation_mode?: Database["public"]["Enums"]["budget_rule_allocation_mode"]
          amount?: number
          amount_enc?: string | null
          budget_config_id: string
          created_at?: string
          deleted_at?: string | null
          enc_version?: number
          frequency?: Database["public"]["Enums"]["recurring_frequency"]
          id?: string
          is_active?: boolean
          name: string
          owner_member_id?: string | null
          priority?: number
          section: Database["public"]["Enums"]["monthly_budget_section"]
          source_account_id: string
          updated_at?: string
        }
        Update: {
          active_from_month?: number | null
          active_months?: number[]
          active_to_month?: number | null
          allocation_mode?: Database["public"]["Enums"]["budget_rule_allocation_mode"]
          amount?: number
          amount_enc?: string | null
          budget_config_id?: string
          created_at?: string
          deleted_at?: string | null
          enc_version?: number
          frequency?: Database["public"]["Enums"]["recurring_frequency"]
          id?: string
          is_active?: boolean
          name?: string
          owner_member_id?: string | null
          priority?: number
          section?: Database["public"]["Enums"]["monthly_budget_section"]
          source_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_rules_budget_config_id_fkey"
            columns: ["budget_config_id"]
            isOneToOne: false
            referencedRelation: "budget_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_rules_owner_member_id_fkey"
            columns: ["owner_member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_rules_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_rules_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          household_id: string
          icon: string | null
          id: string
          is_archived: boolean
          is_default: boolean
          is_discretionary: boolean
          name: string
          parent_id: string | null
          sort_order: number
          type: Database["public"]["Enums"]["category_type"]
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          household_id: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          is_default?: boolean
          is_discretionary?: boolean
          name: string
          parent_id?: string | null
          sort_order?: number
          type: Database["public"]["Enums"]["category_type"]
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          household_id?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          is_default?: boolean
          is_discretionary?: boolean
          name?: string
          parent_id?: string | null
          sort_order?: number
          type?: Database["public"]["Enums"]["category_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_network_configs: {
        Row: {
          account_ids: string[]
          created_at: string
          id: string
          investment_account_ids: string[]
          pot_ids: string[]
          profile_id: string
          savings_account_ids: string[]
          updated_at: string
        }
        Insert: {
          account_ids?: string[]
          created_at?: string
          id?: string
          investment_account_ids?: string[]
          pot_ids?: string[]
          profile_id: string
          savings_account_ids?: string[]
          updated_at?: string
        }
        Update: {
          account_ids?: string[]
          created_at?: string
          id?: string
          investment_account_ids?: string[]
          pot_ids?: string[]
          profile_id?: string
          savings_account_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_network_configs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_attachments: {
        Row: {
          created_at: string
          feedback_id: string
          file_name: string
          file_size: number
          height: number | null
          id: string
          message_id: string | null
          mime_type: string
          storage_path: string
          uploaded_by: string
          width: number | null
        }
        Insert: {
          created_at?: string
          feedback_id: string
          file_name: string
          file_size: number
          height?: number | null
          id?: string
          message_id?: string | null
          mime_type: string
          storage_path: string
          uploaded_by: string
          width?: number | null
        }
        Update: {
          created_at?: string
          feedback_id?: string
          file_name?: string
          file_size?: number
          height?: number | null
          id?: string
          message_id?: string | null
          mime_type?: string
          storage_path?: string
          uploaded_by?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_attachments_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "app_feedback"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "feedback_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_email_attempts: {
        Row: {
          attempt_number: number
          attempted_at: string
          error_code: string | null
          error_message: string | null
          id: number
          outbox_id: string
          provider_message_id: string | null
          provider_response: Json
          succeeded: boolean
        }
        Insert: {
          attempt_number: number
          attempted_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: never
          outbox_id: string
          provider_message_id?: string | null
          provider_response?: Json
          succeeded: boolean
        }
        Update: {
          attempt_number?: number
          attempted_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: never
          outbox_id?: string
          provider_message_id?: string | null
          provider_response?: Json
          succeeded?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "feedback_email_attempts_outbox_id_fkey"
            columns: ["outbox_id"]
            isOneToOne: false
            referencedRelation: "feedback_email_outbox"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_email_outbox: {
        Row: {
          attempt_count: number
          available_at: string
          created_at: string
          id: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          payload: Json
          recipient_email: string
          recipient_id: string
          sent_at: string | null
          source_key: string
          status: string
          template: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          available_at?: string
          created_at?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          payload?: Json
          recipient_email: string
          recipient_id: string
          sent_at?: string | null
          source_key: string
          status?: string
          template: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          available_at?: string
          created_at?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          payload?: Json
          recipient_email?: string
          recipient_id?: string
          sent_at?: string | null
          source_key?: string
          status?: string
          template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_email_outbox_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          feedback_id: string
          from_value: string | null
          id: string
          metadata: Json
          to_value: string | null
          visible_to_author: boolean
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          feedback_id: string
          from_value?: string | null
          id?: string
          metadata?: Json
          to_value?: string | null
          visible_to_author?: boolean
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          feedback_id?: string
          from_value?: string | null
          id?: string
          metadata?: Json
          to_value?: string | null
          visible_to_author?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "feedback_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_events_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "app_feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          edited_at: string | null
          feedback_id: string
          id: string
          is_admin_reply: boolean
          message_type: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          edited_at?: string | null
          feedback_id: string
          id?: string
          is_admin_reply?: boolean
          message_type?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          edited_at?: string | null
          feedback_id?: string
          id?: string
          is_admin_reply?: boolean
          message_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_messages_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "app_feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_rate_limit_events: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: number
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: never
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "feedback_rate_limit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_rpc_requests: {
        Row: {
          actor_id: string
          created_at: string
          idempotency_key: string
          operation: string
          response: Json
        }
        Insert: {
          actor_id: string
          created_at?: string
          idempotency_key: string
          operation: string
          response: Json
        }
        Update: {
          actor_id?: string
          created_at?: string
          idempotency_key?: string
          operation?: string
          response?: Json
        }
        Relationships: [
          {
            foreignKeyName: "feedback_rpc_requests_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      household_encryption_status: {
        Row: {
          created_at: string
          enabled_at: string | null
          enabled_by: string | null
          household_id: string
          is_enabled: boolean
          migration_progress: Json
          migration_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled_at?: string | null
          enabled_by?: string | null
          household_id: string
          is_enabled?: boolean
          migration_progress?: Json
          migration_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled_at?: string | null
          enabled_by?: string | null
          household_id?: string
          is_enabled?: boolean
          migration_progress?: Json
          migration_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_encryption_status_enabled_by_fkey"
            columns: ["enabled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_encryption_status_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          household_id: string
          id: string
          role: Database["public"]["Enums"]["household_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          household_id: string
          id?: string
          role?: Database["public"]["Enums"]["household_role"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          household_id?: string
          id?: string
          role?: Database["public"]["Enums"]["household_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invitations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_key_wraps: {
        Row: {
          created_at: string
          household_id: string
          member_user_id: string
          wrapped_by_user_id: string | null
          wrapped_household_key: string
        }
        Insert: {
          created_at?: string
          household_id: string
          member_user_id: string
          wrapped_by_user_id?: string | null
          wrapped_household_key: string
        }
        Update: {
          created_at?: string
          household_id?: string
          member_user_id?: string
          wrapped_by_user_id?: string | null
          wrapped_household_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_key_wraps_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_key_wraps_member_user_id_fkey"
            columns: ["member_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_key_wraps_wrapped_by_user_id_fkey"
            columns: ["wrapped_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          joined_at: string | null
          role: Database["public"]["Enums"]["household_role"]
          status: Database["public"]["Enums"]["household_member_status"]
          user_id: string
        }
        Insert: {
          household_id: string
          joined_at?: string | null
          role: Database["public"]["Enums"]["household_role"]
          status: Database["public"]["Enums"]["household_member_status"]
          user_id: string
        }
        Update: {
          household_id?: string
          joined_at?: string | null
          role?: Database["public"]["Enums"]["household_role"]
          status?: Database["public"]["Enums"]["household_member_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          deleted_at: string | null
          excess_cash_distribution_method: Database["public"]["Enums"]["excess_cash_distribution_method"]
          fixed_remaining_cash_amount: number
          id: string
          income_mode: Database["public"]["Enums"]["household_income_mode"]
          name: string
          owner_id: string
          remaining_cash_strategy: Database["public"]["Enums"]["remaining_cash_strategy"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          excess_cash_distribution_method?: Database["public"]["Enums"]["excess_cash_distribution_method"]
          fixed_remaining_cash_amount?: number
          id?: string
          income_mode?: Database["public"]["Enums"]["household_income_mode"]
          name: string
          owner_id: string
          remaining_cash_strategy?: Database["public"]["Enums"]["remaining_cash_strategy"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          excess_cash_distribution_method?: Database["public"]["Enums"]["excess_cash_distribution_method"]
          fixed_remaining_cash_amount?: number
          id?: string
          income_mode?: Database["public"]["Enums"]["household_income_mode"]
          name?: string
          owner_id?: string
          remaining_cash_strategy?: Database["public"]["Enums"]["remaining_cash_strategy"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "households_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_email_logs: {
        Row: {
          created_at: string
          error_message: string | null
          household_id: string
          id: string
          invite_link: string
          provider: string
          provider_message_id: string | null
          recipient_email: string
          recipient_role: Database["public"]["Enums"]["household_role"]
          requested_by: string
          sent_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          household_id: string
          id?: string
          invite_link: string
          provider?: string
          provider_message_id?: string | null
          recipient_email: string
          recipient_role: Database["public"]["Enums"]["household_role"]
          requested_by: string
          sent_at?: string | null
          status: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          household_id?: string
          id?: string
          invite_link?: string
          provider?: string
          provider_message_id?: string | null
          recipient_email?: string
          recipient_role?: Database["public"]["Enums"]["household_role"]
          requested_by?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitation_email_logs_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_email_logs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_aliases: {
        Row: {
          alias: string
          alias_enc: string | null
          created_at: string
          created_by: string
          enc_version: number
          household_id: string
          id: string
          merchant_name: string
          merchant_name_enc: string | null
          normalized_alias: string
          normalized_alias_enc: string | null
          updated_at: string
        }
        Insert: {
          alias: string
          alias_enc?: string | null
          created_at?: string
          created_by: string
          enc_version?: number
          household_id: string
          id?: string
          merchant_name: string
          merchant_name_enc?: string | null
          normalized_alias: string
          normalized_alias_enc?: string | null
          updated_at?: string
        }
        Update: {
          alias?: string
          alias_enc?: string | null
          created_at?: string
          created_by?: string
          enc_version?: number
          household_id?: string
          id?: string
          merchant_name?: string
          merchant_name_enc?: string | null
          normalized_alias?: string
          normalized_alias_enc?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_aliases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_aliases_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_budget_runs: {
        Row: {
          budget_config_id: string
          created_at: string
          household_id: string
          id: string
          income_mode_snapshot: Database["public"]["Enums"]["household_income_mode"]
          month: string
          preview_snapshot: Json
          remaining_cash_strategy_snapshot: Database["public"]["Enums"]["remaining_cash_strategy"]
          status: Database["public"]["Enums"]["monthly_budget_run_status"]
          updated_at: string
        }
        Insert: {
          budget_config_id: string
          created_at?: string
          household_id: string
          id?: string
          income_mode_snapshot?: Database["public"]["Enums"]["household_income_mode"]
          month: string
          preview_snapshot?: Json
          remaining_cash_strategy_snapshot?: Database["public"]["Enums"]["remaining_cash_strategy"]
          status?: Database["public"]["Enums"]["monthly_budget_run_status"]
          updated_at?: string
        }
        Update: {
          budget_config_id?: string
          created_at?: string
          household_id?: string
          id?: string
          income_mode_snapshot?: Database["public"]["Enums"]["household_income_mode"]
          month?: string
          preview_snapshot?: Json
          remaining_cash_strategy_snapshot?: Database["public"]["Enums"]["remaining_cash_strategy"]
          status?: Database["public"]["Enums"]["monthly_budget_run_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_budget_runs_budget_config_id_fkey"
            columns: ["budget_config_id"]
            isOneToOne: false
            referencedRelation: "budget_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_budget_runs_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_income_inputs: {
        Row: {
          amount: number
          amount_enc: string | null
          available_month: string
          cash_account_id: string
          created_at: string
          enc_version: number
          id: string
          member_id: string
          monthly_budget_run_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          amount_enc?: string | null
          available_month: string
          cash_account_id: string
          created_at?: string
          enc_version?: number
          id?: string
          member_id: string
          monthly_budget_run_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_enc?: string | null
          available_month?: string
          cash_account_id?: string
          created_at?: string
          enc_version?: number
          id?: string
          member_id?: string
          monthly_budget_run_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_income_inputs_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_income_inputs_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_income_inputs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_income_inputs_monthly_budget_run_id_fkey"
            columns: ["monthly_budget_run_id"]
            isOneToOne: false
            referencedRelation: "monthly_budget_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          created_by: string | null
          is_active: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_admins_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_household_id: string | null
          email: string
          full_name: string | null
          id: string
          locale: string
          onboarding_guides: Json
          preferred_currency: string
          theme: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_household_id?: string | null
          email: string
          full_name?: string | null
          id: string
          locale?: string
          onboarding_guides?: Json
          preferred_currency?: string
          theme?: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_household_id?: string | null
          email?: string
          full_name?: string | null
          id?: string
          locale?: string
          onboarding_guides?: Json
          preferred_currency?: string
          theme?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_household_id_fkey"
            columns: ["default_household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      push_devices: {
        Row: {
          created_at: string
          expo_push_token: string
          id: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expo_push_token: string
          id?: string
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expo_push_token?: string
          id?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_run_executions: {
        Row: {
          attempted_at: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          finished_at: string | null
          household_id: string
          id: string
          recurring_transaction_id: string
          scheduled_for: string
          skip_reason: string | null
          started_at: string
          status: Database["public"]["Enums"]["recurring_execution_status"]
          transaction_ids: string[]
          updated_at: string
        }
        Insert: {
          attempted_at?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          household_id: string
          id?: string
          recurring_transaction_id: string
          scheduled_for: string
          skip_reason?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["recurring_execution_status"]
          transaction_ids?: string[]
          updated_at?: string
        }
        Update: {
          attempted_at?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          household_id?: string
          id?: string
          recurring_transaction_id?: string
          scheduled_for?: string
          skip_reason?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["recurring_execution_status"]
          transaction_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_run_executions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_run_executions_recurring_transaction_id_fkey"
            columns: ["recurring_transaction_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_transactions: {
        Row: {
          account_id: string
          amount: number
          amount_enc: string | null
          category_id: string | null
          created_at: string
          created_by: string
          destination_account_id: string | null
          destination_pot_id: string | null
          enc_version: number
          end_after_occurrences: number | null
          end_condition: Database["public"]["Enums"]["recurring_end_condition"]
          end_date: string | null
          excluded_months: number[]
          expense_kind:
            | Database["public"]["Enums"]["recurring_expense_kind"]
            | null
          frequency: Database["public"]["Enums"]["recurring_frequency"]
          household_id: string
          id: string
          is_active: boolean
          last_run: string | null
          next_run: string
          notes: string | null
          notes_enc: string | null
          occurrences_count: number
          pot_id: string | null
          rule_kind: Database["public"]["Enums"]["recurring_rule_kind"]
          title: string
          title_enc: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          amount_enc?: string | null
          category_id?: string | null
          created_at?: string
          created_by: string
          destination_account_id?: string | null
          destination_pot_id?: string | null
          enc_version?: number
          end_after_occurrences?: number | null
          end_condition?: Database["public"]["Enums"]["recurring_end_condition"]
          end_date?: string | null
          excluded_months?: number[]
          expense_kind?:
            | Database["public"]["Enums"]["recurring_expense_kind"]
            | null
          frequency: Database["public"]["Enums"]["recurring_frequency"]
          household_id: string
          id?: string
          is_active?: boolean
          last_run?: string | null
          next_run: string
          notes?: string | null
          notes_enc?: string | null
          occurrences_count?: number
          pot_id?: string | null
          rule_kind?: Database["public"]["Enums"]["recurring_rule_kind"]
          title: string
          title_enc?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          amount_enc?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string
          destination_account_id?: string | null
          destination_pot_id?: string | null
          enc_version?: number
          end_after_occurrences?: number | null
          end_condition?: Database["public"]["Enums"]["recurring_end_condition"]
          end_date?: string | null
          excluded_months?: number[]
          expense_kind?:
            | Database["public"]["Enums"]["recurring_expense_kind"]
            | null
          frequency?: Database["public"]["Enums"]["recurring_frequency"]
          household_id?: string
          id?: string
          is_active?: boolean
          last_run?: string | null
          next_run?: string
          notes?: string | null
          notes_enc?: string | null
          occurrences_count?: number
          pot_id?: string | null
          rule_kind?: Database["public"]["Enums"]["recurring_rule_kind"]
          title?: string
          title_enc?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_destination_account_id_fkey"
            columns: ["destination_account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_destination_account_id_fkey"
            columns: ["destination_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_destination_pot_id_fkey"
            columns: ["destination_pot_id"]
            isOneToOne: false
            referencedRelation: "saving_pot_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_destination_pot_id_fkey"
            columns: ["destination_pot_id"]
            isOneToOne: false
            referencedRelation: "saving_pots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_pot_id_fkey"
            columns: ["pot_id"]
            isOneToOne: false
            referencedRelation: "saving_pot_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_pot_id_fkey"
            columns: ["pot_id"]
            isOneToOne: false
            referencedRelation: "saving_pots"
            referencedColumns: ["id"]
          },
        ]
      }
      replenishment_run_sources: {
        Row: {
          amount: number
          created_at: string
          id: string
          pot_id: string | null
          resolved_account_id: string
          run_id: string
          sort_order: number
          source_kind: Database["public"]["Enums"]["replenishment_source_kind"]
          suggested_amount: number
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          pot_id?: string | null
          resolved_account_id: string
          run_id: string
          sort_order?: number
          source_kind: Database["public"]["Enums"]["replenishment_source_kind"]
          suggested_amount?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          pot_id?: string | null
          resolved_account_id?: string
          run_id?: string
          sort_order?: number
          source_kind?: Database["public"]["Enums"]["replenishment_source_kind"]
          suggested_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "replenishment_run_sources_pot_id_fkey"
            columns: ["pot_id"]
            isOneToOne: false
            referencedRelation: "saving_pot_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replenishment_run_sources_pot_id_fkey"
            columns: ["pot_id"]
            isOneToOne: false
            referencedRelation: "saving_pots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replenishment_run_sources_resolved_account_id_fkey"
            columns: ["resolved_account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replenishment_run_sources_resolved_account_id_fkey"
            columns: ["resolved_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replenishment_run_sources_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "replenishment_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      replenishment_run_transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          created_at: string
          id: string
          run_id: string
          transaction_date: string
          transaction_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          created_at?: string
          id?: string
          run_id: string
          transaction_date: string
          transaction_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          created_at?: string
          id?: string
          run_id?: string
          transaction_date?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "replenishment_run_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replenishment_run_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replenishment_run_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replenishment_run_transactions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "replenishment_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replenishment_run_transactions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      replenishment_runs: {
        Row: {
          confirmed_at: string | null
          created_at: string
          created_by: string
          household_id: string
          id: string
          preview_snapshot: Json | null
          status: Database["public"]["Enums"]["replenishment_run_status"]
          title: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          created_by: string
          household_id: string
          id?: string
          preview_snapshot?: Json | null
          status?: Database["public"]["Enums"]["replenishment_run_status"]
          title?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          created_by?: string
          household_id?: string
          id?: string
          preview_snapshot?: Json | null
          status?: Database["public"]["Enums"]["replenishment_run_status"]
          title?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "replenishment_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replenishment_runs_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      saving_pot_accounts: {
        Row: {
          account_id: string
          created_at: string
          pot_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          pot_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          pot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saving_pot_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saving_pot_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saving_pot_accounts_pot_id_fkey"
            columns: ["pot_id"]
            isOneToOne: false
            referencedRelation: "saving_pot_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saving_pot_accounts_pot_id_fkey"
            columns: ["pot_id"]
            isOneToOne: false
            referencedRelation: "saving_pots"
            referencedColumns: ["id"]
          },
        ]
      }
      saving_pots: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          enc_version: number
          household_id: string
          icon: string | null
          id: string
          name: string
          target_amount: number | null
          target_amount_enc: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          enc_version?: number
          household_id: string
          icon?: string | null
          id?: string
          name: string
          target_amount?: number | null
          target_amount_enc?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          enc_version?: number
          household_id?: string
          icon?: string | null
          id?: string
          name?: string
          target_amount?: number | null
          target_amount_enc?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saving_pots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saving_pots_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_allocations: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          household_id: string
          id: string
          pot_id: string | null
          sort_order: number
          source_type: string
          transaction_id: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string
          household_id: string
          id?: string
          pot_id?: string | null
          sort_order?: number
          source_type: string
          transaction_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          household_id?: string
          id?: string
          pot_id?: string | null
          sort_order?: number
          source_type?: string
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_allocations_account_id_household_id_fkey"
            columns: ["account_id", "household_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "transaction_allocations_account_id_household_id_fkey"
            columns: ["account_id", "household_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "transaction_allocations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_allocations_pot_id_household_id_fkey"
            columns: ["pot_id", "household_id"]
            isOneToOne: false
            referencedRelation: "saving_pot_balances"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "transaction_allocations_pot_id_household_id_fkey"
            columns: ["pot_id", "household_id"]
            isOneToOne: false
            referencedRelation: "saving_pots"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "transaction_allocations_transaction_id_household_id_fkey"
            columns: ["transaction_id", "household_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      transaction_import_batches: {
        Row: {
          account_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          household_id: string
          id: string
          imported_rows: number
          mapping: Json
          rolled_back_at: string | null
          skipped_rows: number
          source_file_hash: string | null
          source_file_name: string
          status: string
          total_rows: number
        }
        Insert: {
          account_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          household_id: string
          id?: string
          imported_rows?: number
          mapping?: Json
          rolled_back_at?: string | null
          skipped_rows?: number
          source_file_hash?: string | null
          source_file_name: string
          status?: string
          total_rows?: number
        }
        Update: {
          account_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          household_id?: string
          id?: string
          imported_rows?: number
          mapping?: Json
          rolled_back_at?: string | null
          skipped_rows?: number
          source_file_hash?: string | null
          source_file_name?: string
          status?: string
          total_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "transaction_import_batches_account_household_fkey"
            columns: ["account_id", "household_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "transaction_import_batches_account_household_fkey"
            columns: ["account_id", "household_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "transaction_import_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_import_batches_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_reimbursements: {
        Row: {
          amount: number
          amount_enc: string | null
          created_at: string
          created_by: string
          enc_version: number
          household_id: string
          id: string
          note: string | null
          payer_name: string
          transaction_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          amount_enc?: string | null
          created_at?: string
          created_by: string
          enc_version?: number
          household_id: string
          id?: string
          note?: string | null
          payer_name: string
          transaction_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_enc?: string | null
          created_at?: string
          created_by?: string
          enc_version?: number
          household_id?: string
          id?: string
          note?: string | null
          payer_name?: string
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_reimbursements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_reimbursements_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_reimbursements_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_rules: {
        Row: {
          account_id: string | null
          category_id: string | null
          created_at: string
          created_by: string
          enc_version: number
          household_id: string
          id: string
          is_active: boolean
          match_type: string
          merchant_name: string | null
          merchant_name_enc: string | null
          name: string
          normalized_pattern: string
          normalized_pattern_enc: string | null
          pattern: string
          pattern_enc: string | null
          priority: number
          transaction_type:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by: string
          enc_version?: number
          household_id: string
          id?: string
          is_active?: boolean
          match_type: string
          merchant_name?: string | null
          merchant_name_enc?: string | null
          name: string
          normalized_pattern: string
          normalized_pattern_enc?: string | null
          pattern: string
          pattern_enc?: string | null
          priority?: number
          transaction_type?:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string
          enc_version?: number
          household_id?: string
          id?: string
          is_active?: boolean
          match_type?: string
          merchant_name?: string | null
          merchant_name_enc?: string | null
          name?: string
          normalized_pattern?: string
          normalized_pattern_enc?: string | null
          pattern?: string
          pattern_enc?: string | null
          priority?: number
          transaction_type?:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_rules_account_id_household_id_fkey"
            columns: ["account_id", "household_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "transaction_rules_account_id_household_id_fkey"
            columns: ["account_id", "household_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "transaction_rules_category_id_household_id_fkey"
            columns: ["category_id", "household_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "transaction_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_rules_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_splits: {
        Row: {
          amount: number
          amount_enc: string | null
          category_id: string | null
          created_at: string
          enc_version: number
          household_id: string
          id: string
          notes: string | null
          notes_enc: string | null
          sort_order: number
          transaction_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          amount_enc?: string | null
          category_id?: string | null
          created_at?: string
          enc_version?: number
          household_id: string
          id?: string
          notes?: string | null
          notes_enc?: string | null
          sort_order?: number
          transaction_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_enc?: string | null
          category_id?: string | null
          created_at?: string
          enc_version?: number
          household_id?: string
          id?: string
          notes?: string | null
          notes_enc?: string | null
          sort_order?: number
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_splits_category_id_household_id_fkey"
            columns: ["category_id", "household_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "transaction_splits_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_transaction_id_household_id_fkey"
            columns: ["transaction_id", "household_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      transaction_tag_assignments: {
        Row: {
          created_at: string
          household_id: string
          tag_id: string
          transaction_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          tag_id: string
          transaction_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          tag_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_tag_assignments_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_tag_assignments_tag_id_household_id_fkey"
            columns: ["tag_id", "household_id"]
            isOneToOne: false
            referencedRelation: "transaction_tags"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "transaction_tag_assignments_transaction_id_household_id_fkey"
            columns: ["transaction_id", "household_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      transaction_tags: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          household_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          household_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          household_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_tags_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          amount_enc: string | null
          budget_section:
            | Database["public"]["Enums"]["monthly_budget_section"]
            | null
          category_id: string | null
          created_at: string
          created_by: string
          enc_version: number
          generated_by_rule_id: string | null
          household_id: string
          id: string
          import_batch_id: string | null
          import_fingerprint: string | null
          import_source_row: number | null
          is_split: boolean
          merchant_name: string | null
          merchant_name_enc: string | null
          monthly_budget_run_id: string | null
          notes: string | null
          notes_enc: string | null
          pot_id: string | null
          recurring_execution_id: string | null
          replenishment_run_id: string | null
          title: string
          title_enc: string | null
          transaction_date: string
          transfer_group_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          balance_after_transaction: number | null
        }
        Insert: {
          account_id: string
          amount: number
          amount_enc?: string | null
          budget_section?:
            | Database["public"]["Enums"]["monthly_budget_section"]
            | null
          category_id?: string | null
          created_at?: string
          created_by: string
          enc_version?: number
          generated_by_rule_id?: string | null
          household_id: string
          id?: string
          import_batch_id?: string | null
          import_fingerprint?: string | null
          import_source_row?: number | null
          is_split?: boolean
          merchant_name?: string | null
          merchant_name_enc?: string | null
          monthly_budget_run_id?: string | null
          notes?: string | null
          notes_enc?: string | null
          pot_id?: string | null
          recurring_execution_id?: string | null
          replenishment_run_id?: string | null
          title: string
          title_enc?: string | null
          transaction_date?: string
          transfer_group_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          amount_enc?: string | null
          budget_section?:
            | Database["public"]["Enums"]["monthly_budget_section"]
            | null
          category_id?: string | null
          created_at?: string
          created_by?: string
          enc_version?: number
          generated_by_rule_id?: string | null
          household_id?: string
          id?: string
          import_batch_id?: string | null
          import_fingerprint?: string | null
          import_source_row?: number | null
          is_split?: boolean
          merchant_name?: string | null
          merchant_name_enc?: string | null
          monthly_budget_run_id?: string | null
          notes?: string | null
          notes_enc?: string | null
          pot_id?: string | null
          recurring_execution_id?: string | null
          replenishment_run_id?: string | null
          title?: string
          title_enc?: string | null
          transaction_date?: string
          transfer_group_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_generated_by_rule_id_fkey"
            columns: ["generated_by_rule_id"]
            isOneToOne: false
            referencedRelation: "budget_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_import_batch_household_fkey"
            columns: ["import_batch_id", "household_id"]
            isOneToOne: false
            referencedRelation: "transaction_import_batches"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "transactions_monthly_budget_run_id_fkey"
            columns: ["monthly_budget_run_id"]
            isOneToOne: false
            referencedRelation: "monthly_budget_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_pot_id_fkey"
            columns: ["pot_id"]
            isOneToOne: false
            referencedRelation: "saving_pot_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_pot_id_fkey"
            columns: ["pot_id"]
            isOneToOne: false
            referencedRelation: "saving_pots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurring_execution_id_fkey"
            columns: ["recurring_execution_id"]
            isOneToOne: false
            referencedRelation: "recurring_run_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_replenishment_run_id_fkey"
            columns: ["replenishment_run_id"]
            isOneToOne: false
            referencedRelation: "replenishment_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_keypairs: {
        Row: {
          created_at: string
          public_key: string
          updated_at: string
          user_id: string
          wrap_kdf_params: Json
          wrap_salt: string
          wrapped_private_key: string
        }
        Insert: {
          created_at?: string
          public_key: string
          updated_at?: string
          user_id: string
          wrap_kdf_params?: Json
          wrap_salt: string
          wrapped_private_key: string
        }
        Update: {
          created_at?: string
          public_key?: string
          updated_at?: string
          user_id?: string
          wrap_kdf_params?: Json
          wrap_salt?: string
          wrapped_private_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_keypairs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wage_flow_categories: {
        Row: {
          account_ids: string[]
          category_ids: string[]
          color: string
          created_at: string
          household_id: string
          icon: string
          id: string
          include_all_transactions: boolean
          include_transfers_between_accounts: boolean
          include_transfers_into_pots: boolean
          name: string
          pot_account_ids: string[]
          sort_order: number
          updated_at: string
        }
        Insert: {
          account_ids?: string[]
          category_ids?: string[]
          color?: string
          created_at?: string
          household_id: string
          icon?: string
          id?: string
          include_all_transactions?: boolean
          include_transfers_between_accounts?: boolean
          include_transfers_into_pots?: boolean
          name: string
          pot_account_ids?: string[]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          account_ids?: string[]
          category_ids?: string[]
          color?: string
          created_at?: string
          household_id?: string
          icon?: string
          id?: string
          include_all_transactions?: boolean
          include_transfers_between_accounts?: boolean
          include_transfers_into_pots?: boolean
          name?: string
          pot_account_ids?: string[]
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wage_flow_categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      web_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          expiration_time: number | null
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          expiration_time?: number | null
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          expiration_time?: number | null
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "web_push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      account_balances: {
        Row: {
          currency: Database["public"]["Enums"]["currency_code"] | null
          current_balance: number | null
          household_id: string | null
          id: string | null
          initial_balance: number | null
          name: string | null
          type: Database["public"]["Enums"]["account_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_category_spending: {
        Row: {
          category_id: string | null
          household_id: string | null
          month: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_summary: {
        Row: {
          balance: number | null
          expenses: number | null
          household_id: string | null
          income: number | null
          month: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      saving_pot_balances: {
        Row: {
          balance: number | null
          color: string | null
          household_id: string | null
          icon: string | null
          id: string | null
          name: string | null
          saved: number | null
          selected_account_count: number | null
          spent: number | null
          target_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "saving_pots_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_effective_amounts: {
        Row: {
          effective_amount: number | null
          household_id: string | null
          original_amount: number | null
          reimbursed_total: number | null
          transaction_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_household_invitation: {
        Args: { p_token: string }
        Returns: {
          household_id: string
          role: Database["public"]["Enums"]["household_role"]
        }[]
      }
      add_feedback_message: {
        Args: { p_body: string; p_feedback_id: string }
        Returns: {
          author_id: string
          body: string
          created_at: string
          edited_at: string | null
          feedback_id: string
          id: string
          is_admin_reply: boolean
          message_type: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "feedback_messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_feedback_reply: {
        Args: {
          p_body: string
          p_feedback_id: string
          p_idempotency_key: string
          p_internal?: boolean
        }
        Returns: Json
      }
      admin_assign_feedback: {
        Args: { p_admin_id: string; p_feedback_id: string }
        Returns: {
          app_context: Json
          app_version: string | null
          assigned_to: string | null
          category: string
          closed_at: string | null
          created_at: string
          description: string
          id: string
          idempotency_key: string
          last_activity_at: string
          platform: string | null
          priority: string
          resolved_at: string | null
          resolved_in_release_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          withdrawn_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "app_feedback"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_create_app_release: {
        Args: {
          p_idempotency_key: string
          p_platform?: string
          p_release_notes?: string
          p_released_at?: string
          p_status?: string
          p_title?: string
          p_version: string
        }
        Returns: Json
      }
      admin_set_feedback_priority: {
        Args: { p_feedback_id: string; p_priority: string }
        Returns: {
          app_context: Json
          app_version: string | null
          assigned_to: string | null
          category: string
          closed_at: string | null
          created_at: string
          description: string
          id: string
          idempotency_key: string
          last_activity_at: string
          platform: string | null
          priority: string
          resolved_at: string | null
          resolved_in_release_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          withdrawn_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "app_feedback"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_update_app_feedback: {
        Args: {
          p_assigned_admin_id?: string
          p_clear_assignment?: boolean
          p_clear_release?: boolean
          p_feedback_id: string
          p_idempotency_key: string
          p_priority?: string
          p_resolved_in_release_id?: string
          p_status?: string
        }
        Returns: Json
      }
      admin_update_app_release: {
        Args: {
          p_idempotency_key: string
          p_release_id: string
          p_release_notes?: string
          p_released_at?: string
          p_status?: string
          p_title?: string
        }
        Returns: Json
      }
      admin_update_feedback_status: {
        Args: { p_feedback_id: string; p_status: string }
        Returns: {
          app_context: Json
          app_version: string | null
          assigned_to: string | null
          category: string
          closed_at: string | null
          created_at: string
          description: string
          id: string
          idempotency_key: string
          last_activity_at: string
          platform: string | null
          priority: string
          resolved_at: string | null
          resolved_in_release_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          withdrawn_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "app_feedback"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assert_feedback_idempotency_key: {
        Args: { p_key: string }
        Returns: undefined
      }
      attachment_storage_household_id: {
        Args: { p_name: string }
        Returns: string
      }
      attachment_storage_transaction_id: {
        Args: { p_name: string }
        Returns: string
      }
      balance_after_transaction: {
        Args: { "": Database["public"]["Tables"]["transactions"]["Row"] }
        Returns: {
          error: true
        } & "the function public.balance_after_transaction with parameter or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache"
      }
      bulk_update_transaction_category: {
        Args: {
          p_category_id?: string
          p_household_id: string
          p_transaction_ids: string[]
        }
        Returns: number
      }
      bulk_update_transfer_category: {
        Args: {
          p_category_id?: string
          p_household_id: string
          p_transfer_group_ids: string[]
        }
        Returns: number
      }
      check_transaction_allocations_consistency: {
        Args: { p_transaction_id: string }
        Returns: undefined
      }
      claim_feedback_email_outbox: {
        Args: { p_limit?: number; p_worker_id?: string }
        Returns: {
          attempt_count: number
          available_at: string
          created_at: string
          id: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          payload: Json
          recipient_email: string
          recipient_id: string
          sent_at: string | null
          source_key: string
          status: string
          template: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "feedback_email_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_onboarding_guide: {
        Args: { p_guide_key: string; p_version: number }
        Returns: Json
      }
      confirm_monthly_budget_run: {
        Args: { p_preview: Json; p_run_id: string; p_transfers: Json }
        Returns: {
          budget_config_id: string
          created_at: string
          household_id: string
          id: string
          income_mode_snapshot: Database["public"]["Enums"]["household_income_mode"]
          month: string
          preview_snapshot: Json
          remaining_cash_strategy_snapshot: Database["public"]["Enums"]["remaining_cash_strategy"]
          status: Database["public"]["Enums"]["monthly_budget_run_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "monthly_budget_runs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_replenishment_run: {
        Args: { p_preview: Json; p_run_id: string; p_transfers: Json }
        Returns: {
          confirmed_at: string | null
          created_at: string
          created_by: string
          household_id: string
          id: string
          preview_snapshot: Json | null
          status: Database["public"]["Enums"]["replenishment_run_status"]
          title: string | null
          total_amount: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "replenishment_runs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      consume_feedback_rate_limit: {
        Args: {
          p_action: string
          p_actor_id: string
          p_limit: number
          p_window: string
        }
        Returns: undefined
      }
      create_default_accounts: {
        Args: { p_household_id: string }
        Returns: undefined
      }
      create_default_categories: {
        Args: { p_household_id: string }
        Returns: undefined
      }
      create_household: {
        Args: { p_name: string }
        Returns: {
          created_at: string
          deleted_at: string | null
          excess_cash_distribution_method: Database["public"]["Enums"]["excess_cash_distribution_method"]
          fixed_remaining_cash_amount: number
          id: string
          income_mode: Database["public"]["Enums"]["household_income_mode"]
          name: string
          owner_id: string
          remaining_cash_strategy: Database["public"]["Enums"]["remaining_cash_strategy"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "households"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_transfer:
        | {
            Args: {
              p_amount: number
              p_created_by: string
              p_from_account_id: string
              p_household_id: string
              p_notes: string
              p_title: string
              p_to_account_id: string
              p_transaction_date: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount: number
              p_category_id?: string
              p_created_by: string
              p_from_account_id: string
              p_household_id: string
              p_notes: string
              p_title: string
              p_to_account_id: string
              p_transaction_date: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount: number
              p_budget_section?: Database["public"]["Enums"]["monthly_budget_section"]
              p_category_id?: string
              p_created_by: string
              p_from_account_id: string
              p_generated_by_rule_id?: string
              p_household_id: string
              p_monthly_budget_run_id?: string
              p_notes: string
              p_title: string
              p_to_account_id: string
              p_transaction_date: string
            }
            Returns: string
          }
      decline_household_invitation: {
        Args: { p_token: string }
        Returns: boolean
      }
      delete_completed_transfer: {
        Args: { p_transfer_group_id: string }
        Returns: number
      }
      delete_feedback_attachment:
        | { Args: { p_attachment_id: string }; Returns: string }
        | {
            Args: { p_attachment_id: string; p_idempotency_key: string }
            Returns: Json
          }
      delete_household: {
        Args: { p_household_id: string }
        Returns: {
          deleted_hard: boolean
          message: string
          success: boolean
        }[]
      }
      delete_monthly_budget_run_transactions: {
        Args: { p_run_id: string }
        Returns: number
      }
      dispatch_feedback_retention_cleanup: { Args: never; Returns: undefined }
      enqueue_pending_notification_pushes: {
        Args: { p_limit?: number }
        Returns: number
      }
      execute_due_recurring_movements: {
        Args: { p_as_of_date?: string }
        Returns: {
          completed_count: number
          failed_count: number
          skipped_count: number
        }[]
      }
      feedback_storage_author_id: { Args: { p_name: string }; Returns: string }
      feedback_storage_feedback_id: {
        Args: { p_name: string }
        Returns: string
      }
      get_household_invitation_details: {
        Args: { p_token: string }
        Returns: {
          expires_at: string
          household_id: string
          household_name: string
          owner_email: string
          owner_name: string
          role: Database["public"]["Enums"]["household_role"]
        }[]
      }
      is_household_admin: {
        Args: { p_household_id: string; p_user_id: string }
        Returns: boolean
      }
      is_household_member: {
        Args: { p_household_id: string; p_user_id: string }
        Returns: boolean
      }
      is_household_owner: {
        Args: { p_household_id: string; p_user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      leave_household: {
        Args: { p_household_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      list_feedback_retention_objects: {
        Args: {
          p_closed_days?: number
          p_limit?: number
          p_withdrawn_days?: number
        }
        Returns: {
          storage_path: string
        }[]
      }
      list_my_household_invitations: {
        Args: never
        Returns: {
          created_at: string
          email: string
          expires_at: string
          household_id: string
          household_name: string
          id: string
          role: Database["public"]["Enums"]["household_role"]
          token: string
        }[]
      }
      list_transaction_movements: {
        Args: {
          p_account_id?: string
          p_account_ids?: string[]
          p_category_id?: string
          p_created_by?: string
          p_destination_account_id?: string
          p_exclude_transfers?: boolean
          p_from?: string
          p_household_id: string
          p_kind?: string
          p_limit?: number
          p_max_amount?: number
          p_min_amount?: number
          p_offset?: number
          p_search?: string
          p_sort?: string
          p_source_account_id?: string
          p_to?: string
          p_uncategorized?: boolean
        }
        Returns: {
          account: Json
          account_id: string
          allocations: Json
          amount: number
          balance_after_transaction: number
          budget_section: Database["public"]["Enums"]["monthly_budget_section"]
          category: Json
          category_id: string
          created_at: string
          created_by: string
          created_by_profile: Json
          destination_account: Json
          destination_account_id: string
          destination_transaction_id: string
          generated_by_rule_id: string
          household_id: string
          is_split: boolean
          merchant_name: string
          monthly_budget_run_id: string
          movement_id: string
          movement_kind: string
          notes: string
          recurring_execution_id: string
          source_account: Json
          source_account_id: string
          source_transaction_id: string
          title: string
          transaction_date: string
          transaction_id: string
          transfer_group_id: string
          updated_at: string
        }[]
      }
      next_recurring_occurrence: {
        Args: {
          p_date: string
          p_excluded_months?: number[]
          p_frequency: Database["public"]["Enums"]["recurring_frequency"]
        }
        Returns: string
      }
      notify_feedback_recipient: {
        Args: {
          p_body: string
          p_data: Json
          p_recipient_id: string
          p_source_key: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      purge_feedback_retention: {
        Args: {
          p_closed_days?: number
          p_delivery_days?: number
          p_withdrawn_days?: number
        }
        Returns: Json
      }
      purge_read_notifications_older_than: {
        Args: { p_days?: number }
        Returns: number
      }
      purge_soft_deleted_budget_rules: { Args: never; Returns: number }
      queue_feedback_email: {
        Args: {
          p_payload: Json
          p_recipient_id: string
          p_source_key: string
          p_template: string
        }
        Returns: undefined
      }
      record_feedback_email_attempt: {
        Args: {
          p_attempt_number: number
          p_error_code?: string
          p_error_message?: string
          p_outbox_id: string
          p_provider_message_id?: string
          p_provider_response?: Json
          p_retry_after?: string
          p_succeeded: boolean
          p_worker_id: string
        }
        Returns: {
          attempt_count: number
          available_at: string
          created_at: string
          id: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          payload: Json
          recipient_email: string
          recipient_id: string
          sent_at: string | null
          source_key: string
          status: string
          template: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "feedback_email_outbox"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      register_feedback_attachment:
        | {
            Args: {
              p_feedback_id: string
              p_height?: number
              p_idempotency_key: string
              p_message_id?: string
              p_mime_type: string
              p_original_filename: string
              p_size_bytes: number
              p_storage_path: string
              p_width?: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_feedback_id: string
              p_file_name: string
              p_file_size: number
              p_message_id?: string
              p_mime_type: string
              p_storage_path: string
            }
            Returns: {
              created_at: string
              feedback_id: string
              file_name: string
              file_size: number
              height: number | null
              id: string
              message_id: string | null
              mime_type: string
              storage_path: string
              uploaded_by: string
              width: number | null
            }
            SetofOptions: {
              from: "*"
              to: "feedback_attachments"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      remove_household_member: {
        Args: { p_household_id: string; p_user_id_to_remove: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      restore_budget_rule: { Args: { p_rule_id: string }; Returns: boolean }
      save_monthly_budget_configuration: {
        Args: {
          p_config_id: string
          p_excess_cash_distribution_method: Database["public"]["Enums"]["excess_cash_distribution_method"]
          p_fixed_remaining_cash_amount: number
          p_household_id: string
          p_income_mode: Database["public"]["Enums"]["household_income_mode"]
          p_name: string
          p_remaining_cash_strategy: Database["public"]["Enums"]["remaining_cash_strategy"]
          p_rules: Json
        }
        Returns: string
      }
      save_transaction_allocations: {
        Args: { p_allocations: Json; p_transaction_id: string }
        Returns: undefined
      }
      set_default_household: {
        Args: { p_household_id: string }
        Returns: string
      }
      set_saving_pot_accounts: {
        Args: { p_account_ids: string[]; p_pot_id: string }
        Returns: undefined
      }
      submit_app_feedback:
        | {
            Args: {
              p_app_context: Json
              p_category: string
              p_description: string
              p_idempotency_key: string
              p_title: string
            }
            Returns: {
              app_context: Json
              app_version: string | null
              assigned_to: string | null
              category: string
              closed_at: string | null
              created_at: string
              description: string
              id: string
              idempotency_key: string
              last_activity_at: string
              platform: string | null
              priority: string
              resolved_at: string | null
              resolved_in_release_id: string | null
              status: string
              title: string
              updated_at: string
              user_id: string
              withdrawn_at: string | null
            }
            SetofOptions: {
              from: "*"
              to: "app_feedback"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_app_version?: string
              p_category: string
              p_context?: Json
              p_description: string
              p_idempotency_key: string
              p_platform?: string
              p_title: string
            }
            Returns: Json
          }
      summarize_transaction_movements: {
        Args: {
          p_account_id?: string
          p_account_ids?: string[]
          p_category_id?: string
          p_created_by?: string
          p_destination_account_id?: string
          p_exclude_transfers?: boolean
          p_from?: string
          p_household_id: string
          p_kind?: string
          p_max_amount?: number
          p_min_amount?: number
          p_search?: string
          p_source_account_id?: string
          p_to?: string
          p_uncategorized?: boolean
        }
        Returns: {
          expense_total: number
          income_total: number
          movement_count: number
          net_total: number
        }[]
      }
      transfer_household_ownership: {
        Args: { p_household_id: string; p_new_owner_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      update_app_feedback: {
        Args: {
          p_app_version?: string
          p_category?: string
          p_context?: Json
          p_description?: string
          p_feedback_id: string
          p_idempotency_key: string
          p_platform?: string
          p_title?: string
        }
        Returns: Json
      }
      update_completed_transfer: {
        Args: {
          p_amount: number
          p_category_id?: string
          p_destination_account_id: string
          p_notes?: string
          p_source_account_id: string
          p_title: string
          p_transaction_date?: string
          p_transfer_group_id: string
        }
        Returns: string
      }
      withdraw_app_feedback: {
        Args: {
          p_feedback_id: string
          p_idempotency_key: string
          p_reason?: string
        }
        Returns: Json
      }
    }
    Enums: {
      account_type:
        | "cash"
        | "bank"
        | "credit_card"
        | "savings"
        | "investment"
        | "ppr"
      budget_rule_allocation_mode: "equal_split" | "custom"
      category_type: "income" | "expense" | "account"
      currency_code: "EUR" | "USD" | "GBP"
      excess_cash_distribution_method: "even_split"
      household_income_mode: "shared" | "individual"
      household_member_status: "pending" | "accepted"
      household_role: "owner" | "admin" | "member"
      monthly_budget_run_status: "draft" | "confirmed" | "cancelled"
      monthly_budget_section:
        | "income"
        | "savings"
        | "pots"
        | "investments"
        | "ppr"
        | "remaining_cash"
      recurring_end_condition: "never" | "count" | "date"
      recurring_execution_status: "pending" | "completed" | "skipped" | "failed"
      recurring_expense_kind: "subscription" | "bill" | "other"
      recurring_frequency: "daily" | "weekly" | "monthly" | "yearly" | "custom"
      recurring_rule_kind: "transaction" | "transfer"
      remaining_cash_strategy: "keep" | "fixed"
      replenishment_run_status: "draft" | "confirmed" | "cancelled"
      replenishment_source_kind: "account" | "pot"
      transaction_type: "income" | "expense"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_type: [
        "cash",
        "bank",
        "credit_card",
        "savings",
        "investment",
        "ppr",
      ],
      budget_rule_allocation_mode: ["equal_split", "custom"],
      category_type: ["income", "expense", "account"],
      currency_code: ["EUR", "USD", "GBP"],
      excess_cash_distribution_method: ["even_split"],
      household_income_mode: ["shared", "individual"],
      household_member_status: ["pending", "accepted"],
      household_role: ["owner", "admin", "member"],
      monthly_budget_run_status: ["draft", "confirmed", "cancelled"],
      monthly_budget_section: [
        "income",
        "savings",
        "pots",
        "investments",
        "ppr",
        "remaining_cash",
      ],
      recurring_end_condition: ["never", "count", "date"],
      recurring_execution_status: ["pending", "completed", "skipped", "failed"],
      recurring_expense_kind: ["subscription", "bill", "other"],
      recurring_frequency: ["daily", "weekly", "monthly", "yearly", "custom"],
      recurring_rule_kind: ["transaction", "transfer"],
      remaining_cash_strategy: ["keep", "fixed"],
      replenishment_run_status: ["draft", "confirmed", "cancelled"],
      replenishment_source_kind: ["account", "pot"],
      transaction_type: ["income", "expense"],
    },
  },
} as const
