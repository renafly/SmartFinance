import {
  Alert,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { useSession } from "@/shared/session";
import {
  useRemoveHouseholdMember,
  useTransferHouseholdOwnership,
} from "@/features/households/hooks";
import Button from "@/shared/components/ui/Button";
import { spacing } from "@/shared/theme";

type Props = {
  memberId: string;
  memberName: string | null;
  memberRole: "owner" | "admin" | "member";
  householdId: string;
  currentUserIsOwner: boolean;
  currentUserId: string;
  isCurrentUser: boolean;
};

function confirm(message: string): boolean {
  if (Platform.OS === "web") {
    return window.confirm(message);
  }
  return true; // native uses Alert callbacks below
}

export function MemberActionButtons({
  memberId,
  memberName,
  memberRole,
  householdId,
  currentUserIsOwner,
  currentUserId,
  isCurrentUser,
}: Props) {
  const removeMemMutation = useRemoveHouseholdMember();
  const transferOwnershipMutation = useTransferHouseholdOwnership();

  const handleRemoveMember = async () => {
    if (Platform.OS === "web") {
      if (!confirm(`Remove ${memberName || "this member"} from the household? Their access will be revoked immediately.`)) return;
      try {
        await removeMemMutation.mutateAsync({ householdId, userIdToRemove: memberId });
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "Failed to remove member");
      }
      return;
    }
    Alert.alert(
      "Remove Member?",
      `Remove ${memberName || "this member"} from the household? Their access will be revoked immediately.`,
      [
        { text: "Cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeMemMutation.mutateAsync({ householdId, userIdToRemove: memberId });
            } catch (error) {
              Alert.alert("Error", error instanceof Error ? error.message : "Failed to remove member");
            }
          },
        },
      ]
    );
  };

  const handleTransferOwnership = async () => {
    if (Platform.OS === "web") {
      if (!confirm(`Make ${memberName || "this member"} the household owner? You'll become an admin.`)) return;
      try {
        await transferOwnershipMutation.mutateAsync({ householdId, newOwnerId: memberId });
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "Failed to transfer ownership");
      }
      return;
    }
    Alert.alert(
      "Transfer Ownership?",
      `Make ${memberName || "this member"} the household owner? You'll become an admin.`,
      [
        { text: "Cancel" },
        {
          text: "Transfer",
          onPress: async () => {
            try {
              await transferOwnershipMutation.mutateAsync({ householdId, newOwnerId: memberId });
            } catch (error) {
              Alert.alert("Error", error instanceof Error ? error.message : "Failed to transfer ownership");
            }
          },
        },
      ]
    );
  };

  const canRemove = currentUserIsOwner && !isCurrentUser && memberRole !== "owner";
  const canTransfer = currentUserIsOwner && !isCurrentUser && memberRole !== "owner";

  if (!canRemove && !canTransfer) {
    return null;
  }

  return (
    <View style={styles.container}>
      {canTransfer && (
        <Button
          title={transferOwnershipMutation.isPending ? "Transferring..." : "Transfer Ownership"}
          onPress={handleTransferOwnership}
          disabled={transferOwnershipMutation.isPending || removeMemMutation.isPending}
        />
      )}

      {canRemove && (
        <Button
          title={removeMemMutation.isPending ? "Removing..." : "Remove Member"}
          onPress={handleRemoveMember}
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
