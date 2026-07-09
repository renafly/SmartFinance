import { useMutation, useQueryClient } from "@tanstack/react-query";

import { householdBackupService, type HouseholdBackupFile } from "@/features/household-backup/services/household-backup.service";
import { invalidateHouseholdData } from "@/lib/query-invalidation";
import { useAuth } from "@/providers/AuthProvider";

export function useExportHouseholdBackup() {
  return useMutation({
    mutationFn: (householdId: string) => householdBackupService.exportHouseholdBackup(householdId),
  });
}

export function useImportHouseholdBackup() {
  const queryClient = useQueryClient();
  const { profile, refreshSession } = useAuth();

  return useMutation({
    mutationFn: (backup: HouseholdBackupFile) => {
      if (!profile?.id) throw new Error("You must be signed in to import a household backup.");
      return householdBackupService.importHouseholdBackup(backup, profile.id);
    },
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
      void refreshSession();
    },
  });
}
