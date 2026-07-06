import {
  BaseRepository,
  type RepoResult,
} from "@/repositories/base.repository";
import { supabase } from "@/shared/lib/supabase/client";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Account = Database["public"]["Tables"]["accounts"]["Row"];
type AccountBalance = Database["public"]["Views"]["account_balances"]["Row"];

export class AccountsRepository extends BaseRepository<"accounts"> {
  constructor(client: SupabaseClient<Database>) {
    super(client, "accounts");
  }

  /** Accounts for a household. Excludes archived accounts unless includeArchived is true. */
  async listForHousehold(
    householdId: string,
    includeArchived = false,
  ): Promise<RepoResult<Account[]>> {
    let query = this.client
      .from("accounts")
      .select("*")
      .eq("household_id", householdId)
      .order("name", { ascending: true });

    if (!includeArchived) {
      query = query.eq("is_archived", false);
    }

    const { data, error } = await query;
    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  /**
   * Same as listForHousehold but reads from the account_balances view, which
   * includes the computed current_balance column. Note: the view does not
   * expose is_archived, so this always returns every account for the
   * household (archived or not). Filter client-side, or cross-reference
   * listForHousehold() ids if you need archived accounts excluded.
   */
  async listWithBalances(
    householdId: string,
  ): Promise<RepoResult<AccountBalance[]>> {
    const { data, error } = await this.client
      .from("account_balances")
      .select("*")
      .eq("household_id", householdId);

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  async archive(accountId: string): Promise<RepoResult<Account>> {
    return this.update(accountId, { is_archived: true });
  }

  async unarchive(accountId: string): Promise<RepoResult<Account>> {
    return this.update(accountId, { is_archived: false });
  }
}

export const accountsRepository = new AccountsRepository(supabase);
