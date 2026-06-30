import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";

import { AccountForm } from "@/features/accounts/components";
import { useAccount } from "@/features/accounts/hooks/useAccounts";
import { useUpdateAccount } from "@/features/accounts/hooks/useUpdateAccount";

export default function EditAccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: account, isPending } = useAccount(id);

  const update = useUpdateAccount();

  if (isPending) {
    return <ActivityIndicator />;
  }

  if (!account) return null;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <AccountForm
        defaultValues={{
          name: account.name,
          type: account.type,
          currency: account.currency,
          initial_balance: account.initial_balance,
        }}
        loading={update.isPending}
        onSubmit={async (data) => {
          await update.mutateAsync({
            id,
            data,
          });

          router.back();
        }}
      />
    </View>
  );
}