import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import {
  useHouseholdMemberDetails,
} from "@/features/households/hooks";
import { MemberCard } from "@/features/households/components/member-card";
import { useSession } from "@/shared/session";
import { colors, spacing, typography } from "@/shared/theme";

type Member = {
  userId: string;
  role: "owner" | "admin" | "member";
  status: "pending" | "accepted";
  fullName: string | null;
  email: string | null;
};

export default function MembersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: session } = useSession();
  const { data: members, isLoading, error } = useHouseholdMemberDetails();

  const currentUserId = session?.profile.id;
  const isOwner = session?.membership?.role === "owner";

  const handleMemberPress = (member: Member) => {
    // Navigate to member detail screen (to be created)
    router.push({
      pathname: "/(app)/members/[id]" as any,
      params: { id: member.userId },
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { marginTop: insets.top + spacing.md }]}>
        <Text style={styles.loadingText}>Loading members...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { marginTop: insets.top + spacing.md }]}>
        <Text style={styles.errorText}>Failed to load members</Text>
      </View>
    );
  }

  if (!members || members.length === 0) {
    return (
      <View style={[styles.container, { marginTop: insets.top + spacing.md }]}>
        <Text style={styles.emptyText}>No members in this household</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { marginTop: insets.top }]}>
      <FlatList
        data={members}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => (
          <MemberCard
            fullName={item.fullName}
            email={item.email}
            role={item.role}
            isCurrentUser={item.userId === currentUserId}
            onPress={() => handleMemberPress(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },

  listContent: {
    paddingTop: spacing.md,
  },

  loadingText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },

  errorText: {
    ...typography.body,
    color: colors.warning,
    textAlign: "center",
  },

  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
});