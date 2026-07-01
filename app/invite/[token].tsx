import { useEffect, useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import GoogleSignInButton from "@/features/auth/components/google-sign-in-button";
import { useAcceptHouseholdInvitation } from "@/features/households/hooks/useHouseholdInvitations";
import Button from "@/shared/components/ui/Button";
import { useAuthContext } from "@/shared/hooks/use-auth-context";
import { border, colors, radius, spacing, typography } from "@/shared/theme";

export default function InviteTokenScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string | string[] }>();
  const { isLoggedIn, isLoading } = useAuthContext();
  const acceptInvitation = useAcceptHouseholdInvitation();

  const inviteToken = useMemo(() => {
    if (Array.isArray(token)) return token[0] ?? null;
    return token ?? null;
  }, [token]);

  useEffect(() => {
    if (!inviteToken || !isLoggedIn || isLoading) return;
    if (acceptInvitation.isPending || acceptInvitation.isSuccess) return;

    acceptInvitation.mutate(inviteToken, {
      onSuccess: () => {
        router.replace("/(app)/settings");
      },
    });
  }, [
    acceptInvitation,
    inviteToken,
    isLoading,
    isLoggedIn,
    router,
  ]);

  if (!inviteToken) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Invalid invitation link</Text>
          <Text style={styles.message}>
            This invitation link is missing a token. Ask the household admin to send a new invite.
          </Text>
          <Button title="Go to Home" onPress={() => router.replace("/")} />
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <ActivityIndicator size="large" />
          <Text style={styles.message}>Loading your session...</Text>
        </View>
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Sign in to accept invitation</Text>
          <Text style={styles.message}>
            Use your invited account, then this screen will continue automatically.
          </Text>
          <GoogleSignInButton />
        </View>
      </View>
    );
  }

  if (acceptInvitation.isPending) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <ActivityIndicator size="large" />
          <Text style={styles.message}>Accepting invitation...</Text>
        </View>
      </View>
    );
  }

  if (acceptInvitation.isError) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Could not accept invitation</Text>
          <Text style={styles.errorText}>
            {String(acceptInvitation.error?.message ?? "Unknown error")}
          </Text>
          <Button
            title="Try Again"
            onPress={() => acceptInvitation.mutate(inviteToken)}
            disabled={acceptInvitation.isPending}
            loading={acceptInvitation.isPending}
          />
          <Button
            title="Open Settings"
            variant="secondary"
            onPress={() => router.replace("/(app)/settings")}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Invitation accepted</Text>
        <Text style={styles.message}>Redirecting you to Settings...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: border.thick,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
  },
});
