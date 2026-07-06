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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
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
      recurring_transactions: {
        Row: {
          id: string;
          household_id: string;
          account_id: string;
          category_id: string | null;
          pot_id: string | null;
          title: string;
          notes: string | null;
          amount: number;
          type: Database["public"]["Enums"]["transaction_type"];
          frequency: Database["public"]["Enums"]["recurring_frequency"];
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
          title: string;
          notes?: string | null;
          amount: number;
          type: Database["public"]["Enums"]["transaction_type"];
          frequency: Database["public"]["Enums"]["recurring_frequency"];
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
          title?: string;
          notes?: string | null;
          amount?: number;
          type?: Database["public"]["Enums"]["transaction_type"];
          frequency?: Database["public"]["Enums"]["recurring_frequency"];
          next_run?: string;
          last_run?: string | null;
          is_active?: boolean;
          created_by?: string;
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
      transactions: {
        Row: {
          id: string;
          household_id: string;
          account_id: string;
          category_id: string | null;
          pot_id: string | null;
          transfer_group_id: string | null;
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
      transfer_household_ownership: {
        Args: { p_household_id: string; p_new_owner_id: string };
        Returns: {
          success: boolean;
          message: string;
        }[];
      };
    };
    Enums: {
      account_type: "cash" | "bank" | "credit_card" | "savings" | "investment";
      category_type: "income" | "expense" | "account";
      currency_code: "EUR" | "USD" | "GBP";
      household_member_status: "pending" | "accepted";
      household_role: "owner" | "admin" | "member";
      recurring_frequency: "daily" | "weekly" | "monthly" | "yearly";
      transaction_type: "income" | "expense";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
