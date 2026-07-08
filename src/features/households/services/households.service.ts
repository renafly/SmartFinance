import { repositories } from "@/repositories";
import { supabase } from "@/shared/lib/supabase/client";
import type { Database } from "@/types/database.types";

type HouseholdRole = Database["public"]["Enums"]["household_role"];

type CreateInvitationInput = {
  householdId: string;
  email: string;
  role: HouseholdRole;
};

type InvitationDetails = {
  household_id: string;
  household_name: string;
  owner_name: string | null;
  owner_email: string | null;
  role: HouseholdRole;
  expires_at: string | null;
};

class HouseholdsService {
  async createHousehold(name: string) {
    const householdName = name.trim();

    if (!householdName) {
      throw new Error('Household name is required.');
    }

    const { data, error } = await repositories.households.createHousehold(householdName);

    if (error) throw error;

    return data;
  }

  async getMyHouseholds(userId: string) {
    const { data, error } = await repositories.households.listForUser(userId);

    if (error) throw error;
    return data ?? [];
  }

  async updateHouseholdName(householdId: string, name: string) {
    const householdName = name.trim();

    if (!householdName) {
      throw new Error("Household name is required.");
    }

    const { data, error } = await repositories.households.renameHousehold(
      householdId,
      householdName,
    );

    if (error) throw error;
    return data;
  }

  async setDefaultHousehold(householdId: string) {
    const { data, error } = await supabase.rpc("set_default_household", {
      p_household_id: householdId,
    });

    if (error) throw error;
    return data;
  }

  async deleteHousehold(householdId: string) {
    const { data, error } = await supabase.rpc("delete_household", {
      p_household_id: householdId,
    });

    if (error) throw error;

    const row = (Array.isArray(data) ? data[0] : data) as
      | { success?: boolean; message?: string; deleted_hard?: boolean }
      | undefined;

    if (!row || typeof row.success !== "boolean" || !row.message) {
      throw new Error("Invalid RPC response for household deletion.");
    }

    return {
      success: row.success,
      message: row.message,
      deletedHard: Boolean(row.deleted_hard),
    };
  }

  async getInvitationDetails(token: string): Promise<InvitationDetails | null> {
    const { data, error } = await repositories.households.getInvitationDetails(token);

    if (error) throw error;
    return data;
  }

  async getInvitations(householdId: string) {
    const { data, error } = await repositories.households.listInvitations(
      householdId
    );

    if (error) throw error;

    return data ?? [];
  }

  async createInvitation(input: CreateInvitationInput) {
    const email = input.email.trim().toLowerCase();

    const token = `invite_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 12)}`;

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

    const { data, error } = await repositories.households.createInvitation({
      household_id: input.householdId,
      email,
      role: input.role,
      token,
      expires_at: expiresAt,
    });

    if (error) throw error;

    const configuredWebBase = process.env.EXPO_PUBLIC_INVITE_WEB_URL?.replace(/\/$/, "");
    const runtimeWebBase =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : undefined;

    const inviteWebBaseUrl = configuredWebBase ?? runtimeWebBase;
    const nativeInviteLink = `smartfinance://invite/${token}`;
    const webInviteLink = inviteWebBaseUrl
      ? `${inviteWebBaseUrl}/invite/${token}`
      : null;

    // Prefer a web URL in browsers so localhost testing works from email click-through.
    const inviteLink = webInviteLink ?? nativeInviteLink;

    // Optional async delivery: if the edge function is not deployed yet, keep the
    // invitation creation successful and allow manual link sharing.
    const { error: emailError } = await supabase.functions.invoke(
      "send-household-invitation",
      {
        body: {
          email,
          role: input.role,
          inviteLink,
          nativeInviteLink,
          webInviteLink,
          householdId: input.householdId,
        },
      }
    );

    return {
      invitation: data,
      inviteLink,
      emailQueued: !emailError,
    };
  }

  async revokeInvitation(invitationId: string) {
    const { error } = await repositories.households.deleteInvitation(invitationId);

    if (error) throw error;
  }

  async getMyInvitations() {
    const { data, error } = await repositories.households.listMyInvitations();

    if (error) throw error;
    return data ?? [];
  }

  async acceptMyInvitation(token: string) {
    const { data, error } = await repositories.households.acceptInvitationByToken(token);

    if (error) throw error;
    return data;
  }

  async declineMyInvitation(token: string) {
    const { data, error } = await repositories.households.declineInvitationByToken(token);

    if (error) throw error;
    return data ?? false;
  }

  async transferOwnership(householdId: string, newOwnerId: string) {
    const { data, error } = await repositories.households.transferOwnership(
      householdId,
      newOwnerId
    );

    if (error) throw new Error((error as any)?.message ?? 'Failed to transfer ownership');
    if (!data?.success) throw new Error(data?.message ?? 'Failed to transfer ownership');
    return data;
  }

  async removeMember(householdId: string, userIdToRemove: string) {
    const { data, error } = await repositories.households.removeMemberByRpc(
      householdId,
      userIdToRemove
    );

    if (error) throw new Error((error as any)?.message ?? 'Failed to remove member');
    if (!data?.success) throw new Error(data?.message ?? 'Failed to remove member');
    return data;
  }

  async leaveHousehold(householdId: string) {
    const { data, error } = await repositories.households.leaveHousehold(householdId);

    if (error) throw new Error((error as any)?.message ?? 'Failed to leave household');
    if (!data?.success) throw new Error(data?.message ?? 'Failed to leave household');
    return data;
  }
}

export const householdsService = new HouseholdsService();

