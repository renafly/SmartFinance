import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/shared/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

type HouseholdMemberDetails = {
  userId: string;
  role: "owner" | "admin" | "member";
  status: "pending" | "accepted";
  fullName: string | null;
  email: string | null;
};

export type { HouseholdMemberDetails };

export function useHouseholdMemberDetails() {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: ["household-member-details", householdId],
    queryFn: async (): Promise<HouseholdMemberDetails[]> => {
      const { data, error } = await supabase
        .from("household_members")
        .select(
          "user_id, role, status, profile:profiles!household_members_user_id_fkey(full_name, email)"
        )
        .eq("household_id", householdId!)
        .order("joined_at", { ascending: true });

      if (error) throw error;

      return (data ?? []).map((row) => {
        const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;

        return {
          userId: row.user_id,
          role: row.role,
          status: row.status,
          fullName: profile?.full_name ?? null,
          email: profile?.email ?? null,
        };
      });
    },
    enabled: !!householdId && !isLoading,
  });
}
