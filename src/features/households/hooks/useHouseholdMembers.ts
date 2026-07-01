import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/lib/supabase/client";
import { useSession } from "@/shared/session";

type MemberProfile = { id: string; full_name: string | null };

export function useHouseholdMembers() {
  const { data: session } = useSession();
  const householdId = session?.household.id;

  return useQuery({
    queryKey: ["household-members", householdId],
    queryFn: async (): Promise<MemberProfile[]> => {
      const { data, error } = await supabase
        .from("household_members")
        .select("profile:profiles!household_members_user_id_fkey(id, full_name)")
        .eq("household_id", householdId!)
        .eq("status", "accepted");

      if (error) throw error;

      return (data ?? [])
        .flatMap((row) => row.profile ?? [])
        .filter((p): p is MemberProfile => p != null) as unknown as MemberProfile[];
    },
    enabled: !!householdId,
  });
}