import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/lib/supabase/client";
import { useSession } from "@/shared/session";

export function useHouseholdMembers() {
  const { data: session } = useSession();
  const householdId = session?.household.id;

  return useQuery({
    queryKey: ["household-members", householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("household_id", householdId!);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!householdId,
  });
}