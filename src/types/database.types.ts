export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string;
          household_id: string;
          owner_profile_id: string | null;
          name: string;
          type: Database["public"]["Enums"]["account_type"];
          currency: Database["public"]["Enums"]["currency_code"];
          initial_balance: number;
          icon: string | null;
          color: string | null;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          owner_profile_id?: string | null;
          name: string;
          type: Database["public"]["Enums"]["account_type"];
          currency?: Database["public"]["Enums"]["currency_code"];
          initial_balance?: number;
          icon?: string | null;
          color?: string | null;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          owner_profile_id?: string | null;
          name?: string;
          type?: Database["public"]["Enums"]["account_type"];
          currency?: Database["public"]["Enums"]["currency_code"];
          initial_balance?: number;
          icon?: string | null;
          color?: string | null;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      attachments: {
        Row: {
          id: string;
          transaction_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          file_size: number;
          uploaded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          file_size: number;
          uploaded_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          transaction_id?: string;
          storage_path?: string;
          file_name?: string;
          mime_type?: string;
          file_size?: number;
          uploaded_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      app_notifications: {
        Row: { id: string; household_id: string | null; recipient_id: string; type: string; title: string; body: string; data: Json; source_key: string | null; read_at: string | null; created_at: string };
        Insert: { id?: string; household_id?: string | null; recipient_id: string; type: string; title: string; body: string; data?: Json; source_key?: string | null; read_at?: string | null; created_at?: string };
        Update: { id?: string; household_id?: string | null; recipient_id?: string; type?: string; title?: string; body?: string; data?: Json; source_key?: string | null; read_at?: string | null; created_at?: string };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          type: Database["public"]["Enums"]["category_type"];
          icon: string | null;
          color: string | null;
          parent_id: string | null;
          is_default: boolean;
          sort_order: number;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          type: Database["public"]["Enums"]["category_type"];
          icon?: string | null;
          color?: string | null;
          parent_id?: string | null;
          is_default?: boolean;
          sort_order?: number;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          type?: Database["public"]["Enums"]["category_type"];
          icon?: string | null;
          color?: string | null;
          parent_id?: string | null;
          is_default?: boolean;
          sort_order?: number;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      household_invitations: {
        Row: {
          id: string;
          household_id: string;
          email: string;
          role: Database["public"]["Enums"]["household_role"];
          token: string;
          expires_at: string | null;
          accepted_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          household_id: string;
          email: string;
          role?: Database["public"]["Enums"]["household_role"];
          token: string;
          expires_at?: string | null;
          accepted_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          household_id?: string;
          email?: string;
          role?: Database["public"]["Enums"]["household_role"];
          token?: string;
          expires_at?: string | null;
          accepted_at?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      household_members: {
        Row: {
          household_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["household_role"];
          status: Database["public"]["Enums"]["household_member_status"];
          joined_at: string | null;
        };
        Insert: {
          household_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["household_role"];
          status: Database["public"]["Enums"]["household_member_status"];
          joined_at?: string | null;
        };
        Update: {
          household_id?: string;
          user_id?: string;
          role?: Database["public"]["Enums"]["household_role"];
          status?: Database["public"]["Enums"]["household_member_status"];
          joined_at?: string | null;
        };
        Relationships: [];
      };
      households: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          income_mode: Database["public"]["Enums"]["household_income_mode"];
          remaining_cash_strategy: Database["public"]["Enums"]["remaining_cash_strategy"];
          fixed_remaining_cash_amount: number;
          excess_cash_distribution_method: Database["public"]["Enums"]["excess_cash_distribution_method"];
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          income_mode?: Database["public"]["Enums"]["household_income_mode"];
          remaining_cash_strategy?: Database["public"]["Enums"]["remaining_cash_strategy"];
          fixed_remaining_cash_amount?: number;
          excess_cash_distribution_method?: Database["public"]["Enums"]["excess_cash_distribution_method"];
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          income_mode?: Database["public"]["Enums"]["household_income_mode"];
          remaining_cash_strategy?: Database["public"]["Enums"]["remaining_cash_strategy"];
          fixed_remaining_cash_amount?: number;
          excess_cash_distribution_method?: Database["public"]["Enums"]["excess_cash_distribution_method"];
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      budget_configs: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      budget_rules: {
        Row: {
          id: string;
          budget_config_id: string;
          name: string;
          section: Database["public"]["Enums"]["monthly_budget_section"];
          source_account_id: string;
          destination_account_id: string;
          destination_pot_id: string | null;
          owner_member_id: string | null;
          amount: number;
          frequency: Database["public"]["Enums"]["recurring_frequency"];
          priority: number;
          is_active: boolean;
          active_months: number[] | null;
          active_from_month: number | null;
          active_to_month: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          budget_config_id: string;
          name: string;
          section: Database["public"]["Enums"]["monthly_budget_section"];
          source_account_id: string;
          destination_account_id: string;
          destination_pot_id?: string | null;
          owner_member_id?: string | null;
          amount?: number;
          frequency?: Database["public"]["Enums"]["recurring_frequency"];
          priority?: number;
          is_active?: boolean;
          active_months?: number[] | null;
          active_from_month?: number | null;
          active_to_month?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          budget_config_id?: string;
          name?: string;
          section?: Database["public"]["Enums"]["monthly_budget_section"];
          source_account_id?: string;
          destination_account_id?: string;
          destination_pot_id?: string | null;
          owner_member_id?: string | null;
          amount?: number;
          frequency?: Database["public"]["Enums"]["recurring_frequency"];
          priority?: number;
          is_active?: boolean;
          active_months?: number[] | null;
          active_from_month?: number | null;
          active_to_month?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      monthly_budget_runs: {
        Row: {
          id: string;
          household_id: string;
          budget_config_id: string;
          month: string;
          status: Database["public"]["Enums"]["monthly_budget_run_status"];
          income_mode_snapshot: Database["public"]["Enums"]["household_income_mode"];
          remaining_cash_strategy_snapshot: Database["public"]["Enums"]["remaining_cash_strategy"];
          preview_snapshot: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          budget_config_id: string;
          month: string;
          status?: Database["public"]["Enums"]["monthly_budget_run_status"];
          income_mode_snapshot?: Database["public"]["Enums"]["household_income_mode"];
          remaining_cash_strategy_snapshot?: Database["public"]["Enums"]["remaining_cash_strategy"];
          preview_snapshot?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          budget_config_id?: string;
          month?: string;
          status?: Database["public"]["Enums"]["monthly_budget_run_status"];
          income_mode_snapshot?: Database["public"]["Enums"]["household_income_mode"];
          remaining_cash_strategy_snapshot?: Database["public"]["Enums"]["remaining_cash_strategy"];
          preview_snapshot?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      monthly_income_inputs: {
        Row: {
          id: string;
          monthly_budget_run_id: string;
          member_id: string;
          cash_account_id: string;
          amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          monthly_budget_run_id: string;
          member_id: string;
          cash_account_id: string;
          amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          monthly_budget_run_id?: string;
          member_id?: string;
          cash_account_id?: string;
          amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      invitation_email_logs: {
        Row: {
          id: string;
          household_id: string;
          requested_by: string;
          recipient_email: string;
          recipient_role: Database["public"]["Enums"]["household_role"];
          invite_link: string;
          provider: string;
          provider_message_id: string | null;
          status: "queued" | "sent" | "failed";
          error_message: string | null;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          requested_by: string;
          recipient_email: string;
          recipient_role: Database["public"]["Enums"]["household_role"];
          invite_link: string;
          provider?: string;
          provider_message_id?: string | null;
          status: "queued" | "sent" | "failed";
          error_message?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          requested_by?: string;
          recipient_email?: string;
          recipient_role?: Database["public"]["Enums"]["household_role"];
          invite_link?: string;
          provider?: string;
          provider_message_id?: string | null;
          status?: "queued" | "sent" | "failed";
          error_message?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          preferred_currency: string;
          locale: string;
          timezone: string | null;
          default_household_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          preferred_currency?: string;
          locale?: string;
          timezone?: string | null;
          default_household_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          preferred_currency?: string;
          locale?: string;
          timezone?: string | null;
          default_household_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_devices: {
        Row: { id: string; user_id: string; expo_push_token: string; platform: "android" | "ios"; updated_at: string; created_at: string };
        Insert: { id?: string; user_id: string; expo_push_token: string; platform: "android" | "ios"; updated_at?: string; created_at?: string };
        Update: { id?: string; user_id?: string; expo_push_token?: string; platform?: "android" | "ios"; updated_at?: string; created_at?: string };
        Relationships: [];
      };
      recurring_transactions: {
        Row: {
          id: string;
          household_id: string;
          account_id: string;
          category_id: string | null;
          pot_id: string | null;
          rule_kind: Database["public"]["Enums"]["recurring_rule_kind"];
          destination_account_id: string | null;
          destination_pot_id: string | null;
          title: string;
          notes: string | null;
          amount: number;
          type: Database["public"]["Enums"]["transaction_type"];
          frequency: Database["public"]["Enums"]["recurring_frequency"];
          excluded_months: number[] | null;
          next_run: string;
          last_run: string | null;
          is_active: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          account_id: string;
          category_id?: string | null;
          pot_id?: string | null;
          rule_kind?: Database["public"]["Enums"]["recurring_rule_kind"];
          destination_account_id?: string | null;
          destination_pot_id?: string | null;
          title: string;
          notes?: string | null;
          amount: number;
          type: Database["public"]["Enums"]["transaction_type"];
          frequency: Database["public"]["Enums"]["recurring_frequency"];
          excluded_months?: number[] | null;
          next_run: string;
          last_run?: string | null;
          is_active?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          account_id?: string;
          category_id?: string | null;
          pot_id?: string | null;
          rule_kind?: Database["public"]["Enums"]["recurring_rule_kind"];
          destination_account_id?: string | null;
          destination_pot_id?: string | null;
          title?: string;
          notes?: string | null;
          amount?: number;
          type?: Database["public"]["Enums"]["transaction_type"];
          frequency?: Database["public"]["Enums"]["recurring_frequency"];
          excluded_months?: number[] | null;
          next_run?: string;
          last_run?: string | null;
          is_active?: boolean;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recurring_run_executions: {
        Row: {
          id: string;
          household_id: string;
          recurring_transaction_id: string;
          scheduled_for: string;
          status: Database["public"]["Enums"]["recurring_execution_status"];
          skip_reason: string | null;
          error_message: string | null;
          transaction_ids: string[];
          started_at: string;
          finished_at: string | null;
          attempted_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          recurring_transaction_id: string;
          scheduled_for: string;
          status?: Database["public"]["Enums"]["recurring_execution_status"];
          skip_reason?: string | null;
          error_message?: string | null;
          transaction_ids?: string[];
          started_at?: string;
          finished_at?: string | null;
          attempted_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          recurring_transaction_id?: string;
          scheduled_for?: string;
          status?: Database["public"]["Enums"]["recurring_execution_status"];
          skip_reason?: string | null;
          error_message?: string | null;
          transaction_ids?: string[];
          started_at?: string;
          finished_at?: string | null;
          attempted_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      saving_pots: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          target_amount: number | null;
          color: string | null;
          icon: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          target_amount?: number | null;
          color?: string | null;
          icon?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          target_amount?: number | null;
          color?: string | null;
          icon?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      saving_pot_accounts: {
        Row: {
          pot_id: string;
          account_id: string;
          created_at: string;
        };
        Insert: {
          pot_id: string;
          account_id: string;
          created_at?: string;
        };
        Update: {
          pot_id?: string;
          account_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          household_id: string;
          account_id: string;
          category_id: string | null;
          pot_id: string | null;
          transfer_group_id: string | null;
          monthly_budget_run_id: string | null;
          generated_by_rule_id: string | null;
          recurring_execution_id: string | null;
          budget_section: Database["public"]["Enums"]["monthly_budget_section"] | null;
          title: string;
          notes: string | null;
          amount: number;
          type: Database["public"]["Enums"]["transaction_type"];
          transaction_date: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          account_id: string;
          category_id?: string | null;
          pot_id?: string | null;
          transfer_group_id?: string | null;
          monthly_budget_run_id?: string | null;
          generated_by_rule_id?: string | null;
          recurring_execution_id?: string | null;
          budget_section?: Database["public"]["Enums"]["monthly_budget_section"] | null;
          title: string;
          notes?: string | null;
          amount: number;
          type: Database["public"]["Enums"]["transaction_type"];
          transaction_date?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          account_id?: string;
          category_id?: string | null;
          pot_id?: string | null;
          transfer_group_id?: string | null;
          monthly_budget_run_id?: string | null;
          generated_by_rule_id?: string | null;
          recurring_execution_id?: string | null;
          budget_section?: Database["public"]["Enums"]["monthly_budget_section"] | null;
          title?: string;
          notes?: string | null;
          amount?: number;
          type?: Database["public"]["Enums"]["transaction_type"];
          transaction_date?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      account_balances: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          type: Database["public"]["Enums"]["account_type"];
          currency: Database["public"]["Enums"]["currency_code"];
          initial_balance: number;
          current_balance: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      monthly_category_spending: {
        Row: {
          household_id: string;
          category_id: string | null;
          month: string;
          total: number | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      monthly_summary: {
        Row: {
          household_id: string;
          month: string;
          income: number | null;
          expenses: number | null;
          balance: number | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      saving_pot_balances: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          target_amount: number | null;
          color: string | null;
          icon: string | null;
          selected_account_count: number | null;
          saved: number | null;
          spent: number | null;
          balance: number | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Functions: {
      accept_household_invitation: {
        Args: { p_token: string };
        Returns: {
          household_id: string;
          role: Database["public"]["Enums"]["household_role"];
        }[];
      };
      create_default_accounts: {
        Args: { p_household_id: string };
        Returns: undefined;
      };
      create_default_categories: {
        Args: { p_household_id: string };
        Returns: undefined;
      };
      create_household: {
        Args: { p_name: string };
        Returns: Database["public"]["Tables"]["households"]["Row"];
      };
      create_transfer: {
        Args: {
          p_household_id: string;
          p_from_account_id: string;
          p_to_account_id: string;
          p_amount: number;
          p_title: string;
          p_notes: string | null;
          p_transaction_date: string;
          p_created_by: string;
          p_category_id?: string | null;
          p_monthly_budget_run_id?: string | null;
          p_generated_by_rule_id?: string | null;
          p_budget_section?: Database["public"]["Enums"]["monthly_budget_section"] | null;
        };
        Returns: string;
      };
      decline_household_invitation: {
        Args: { p_token: string };
        Returns: boolean;
      };
      is_household_admin: {
        Args: { p_household_id: string; p_user_id: string };
        Returns: boolean;
      };
      is_household_member: {
        Args: { p_household_id: string; p_user_id: string };
        Returns: boolean;
      };
      is_household_owner: {
        Args: { p_household_id: string; p_user_id: string };
        Returns: boolean;
      };
      leave_household: {
        Args: { p_household_id: string };
        Returns: {
          success: boolean;
          message: string;
        }[];
      };
      list_my_household_invitations: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          household_id: string;
          household_name: string;
          email: string;
          role: Database["public"]["Enums"]["household_role"];
          token: string;
          expires_at: string | null;
          created_at: string | null;
        }[];
      };
      remove_household_member: {
        Args: { p_household_id: string; p_user_id_to_remove: string };
        Returns: {
          success: boolean;
          message: string;
        }[];
      };
      set_default_household: {
        Args: { p_household_id: string };
        Returns: string;
      };
      set_saving_pot_accounts: {
        Args: { p_pot_id: string; p_account_ids: string[] };
        Returns: void;
      };
      transfer_household_ownership: {
        Args: { p_household_id: string; p_new_owner_id: string };
        Returns: {
          success: boolean;
          message: string;
        }[];
      };
    };
    Enums: {
      account_type: "cash" | "bank" | "credit_card" | "savings" | "investment" | "ppr";
      category_type: "income" | "expense" | "account";
      currency_code: "EUR" | "USD" | "GBP";
      excess_cash_distribution_method: "even_split";
      household_member_status: "pending" | "accepted";
      household_income_mode: "shared" | "individual";
      household_role: "owner" | "admin" | "member";
      monthly_budget_run_status: "draft" | "confirmed" | "cancelled";
      monthly_budget_section: "income" | "savings" | "pots" | "investments" | "ppr" | "remaining_cash";
      remaining_cash_strategy: "keep" | "fixed";
      recurring_frequency: "daily" | "weekly" | "monthly" | "yearly" | "custom";
      recurring_execution_status: "pending" | "completed" | "skipped" | "failed";
      recurring_rule_kind: "transaction" | "transfer";
      transaction_type: "income" | "expense";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
