import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useSession } from "@/shared/session";
import {
  useRemoveHouseholdMember,
  useTransferHouseholdOwnership,
} from "@/features/households/hooks";
import Button from "@/shared/components/ui/Button";
import { colors, spacing, typography } from "@/shared/theme";

type Props = {
  memberId: string;
  memberName: string | null;
  memberRole: "owner" | "admin" | "member";
  householdId: string;
  currentUserIsOwner: boolean;
  currentUserId: string;
  isCurrentUser: boolean;
};

export function MemberActionButtons({
  memberId,
  memberName,
  memberRole,
  householdId,
  currentUserIsOwner,
  currentUserId,
  isCurrentUser,
}: Props) {
  const { data: session } = useSession();
  const removeMemMutation = useRemoveHouseholdMember();
  const transferOwnershipMutation = useTransferHouseholdOwnership();

  const handleRemoveMember = async () => {
    try {
      await removeMemMutation.mutateAsync({
        householdId,
        userIdToRemove: memberId,
      });
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to remove member"
      );
    }
  };

  const handleTransferOwnership = async () => {
    try {
      await transferOwnershipMutation.mutateAsync({
        householdId,
        newOwnerId: memberId,
      });
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to transfer ownership"
      );
    }
  };

  // Only show remove button if current user is owner/admin and not removing themselves or the owner
  const canRemove =
    currentUserIsOwner && !isCurrentUser && memberRole !== "owner";

  // Only show transfer button if current user is owner and target is not already owner/self
  const canTransfer =
    currentUserIsOwner && !isCurrentUser && memberRole !== "owner";

  if (!canRemove && !canTransfer) {
    return null;
  }

  return (
    <View style={styles.container}>
      {canTransfer && (
        <Button
          title={transferOwnershipMutation.isPending ? "Transferring..." : "Transfer Ownership"}
          onPress={() => {
            Alert.alert(
              "Transfer Ownership?",
              `Make ${memberName || "this member"} the household owner? You'll become an admin.`,
              [
                { text: "Cancel", onPress: () => {} },
                {
                  text: "Transfer",
                  onPress: handleTransferOwnership,
                },
              ]
            );
          }}
          disabled={transferOwnershipMutation.isPending || removeMemMutation.isPending}
        />
      )}

      {canRemove && (
        <Button
          title={removeMemMutation.isPending ? "Removing..." : "Remove Member"}
          onPress={() => {
            Alert.alert(
              "Remove Member?",
              `Remove ${memberName || "this member"} from the household? Their access will be revoked immediately.`,
              [
                { text: "Cancel", onPress: () => {} },
                {
                  text: "Remove",
                  onPress: handleRemoveMember,
                  style: "destructive",
                },
              ]
            );
          }}
          disabled={removeMemMutation.isPending || transferOwnershipMutation.isPending}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
});
