import { useState } from "react";
import { ActivityIndicator, Alert, TextInput as NativeTextInput, View } from "react-native";
import { Text } from "react-native-paper";

import Button from "@/shared/components/ui/Button";
import Card from "@/shared/components/ui/Card";
import EmptyState from "@/shared/components/ui/EmptyState";
import PageHeader from "@/shared/components/ui/PageHeader";
import Screen from "@/shared/components/ui/Screen";
import Section from "@/shared/components/ui/Section";
import { useSavingPotBalances, useSavingPots, useCreateSavingPot, useDeleteSavingPot } from "@/features/saving-pots/hooks";
import { useFormatters, useI18n } from "@/shared/i18n";
import { useSession } from "@/shared/session";
import { colors, spacing } from "@/shared/theme";

export default function SavingsScreen() {
  const { t } = useI18n();
  const { formatCurrency } = useFormatters();
  const { data: session } = useSession();
  const householdId = session?.household.id;

  const { data: pots = [], isPending: potsLoading } = useSavingPots();
  const { data: balances = [], isPending: balancesLoading } = useSavingPotBalances();
  const createPot = useCreateSavingPot();
  const deletePot = useDeleteSavingPot();

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");

  const balanceMap = new Map(balances.map((b) => [b.id, b]));

  const onCreate = async () => {
    if (!householdId || !session) return;
    if (!name.trim()) return;

    await createPot.mutateAsync({
      household_id: householdId,
      name: name.trim(),
      target_amount: targetAmount ? Number(targetAmount) : null,
      created_by: session.profile.id,
    });

    setName("");
    setTargetAmount("");
  };

  if (potsLoading || balancesLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 56,
    color: colors.text,
  } as const;

  return (
    <Screen>
      <PageHeader title={t("savings.title")} subtitle={t("savings.subtitle")} />

      <Section title={t("savings.createTitle")}>
        <Card>
          <View style={{ gap: spacing.md }}>
            <View style={{ gap: spacing.sm }}>
              <Text style={{ fontWeight: "700" }}>{t("savings.name")}</Text>
              <NativeTextInput
                value={name}
                onChangeText={setName}
                placeholder={t("savings.name")}
                placeholderTextColor={colors.textMuted}
                style={inputStyle}
              />
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text style={{ fontWeight: "700" }}>{t("savings.targetOptional")}</Text>
              <NativeTextInput
                value={targetAmount}
                onChangeText={setTargetAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                style={inputStyle}
              />
            </View>

            <Button
              title={t("savings.create")}
              onPress={onCreate}
              loading={createPot.isPending}
              disabled={!name.trim() || createPot.isPending}
            />
          </View>
        </Card>
      </Section>

      <Section title={t("savings.currentTitle")}>
        {pots.length === 0 ? (
          <EmptyState message={t("savings.empty")} />
        ) : (
          pots.map((pot) => {
            const bal = balanceMap.get(pot.id);
            const balance = Number(bal?.balance ?? 0);
            const saved = Number(bal?.saved ?? 0);
            const spent = Number(bal?.spent ?? 0);
            const target = pot.target_amount ? Number(pot.target_amount) : null;
            const progress = target && target > 0 ? Math.min(100, Math.round((balance / target) * 100)) : null;

            return (
              <Card key={pot.id}>
                <View style={{ gap: spacing.sm }}>
                  <Text style={{ fontWeight: "800", fontSize: 16 }}>{pot.name}</Text>

                  <Text>{t("savings.balance", { value: formatCurrency(balance) })}</Text>
                  <Text style={{ color: colors.textMuted }}>{t("savings.saved", { value: formatCurrency(saved) })}</Text>
                  <Text style={{ color: colors.textMuted }}>{t("savings.spent", { value: formatCurrency(spent) })}</Text>

                  {target !== null && (
                    <>
                      <Text style={{ color: colors.textMuted }}>{t("savings.target", { value: formatCurrency(target) })}</Text>
                      <View style={{ height: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 4, overflow: "hidden" }}>
                        <View style={{ width: `${progress ?? 0}%` as any, height: "100%", backgroundColor: colors.primary }} />
                      </View>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t("savings.progress", { percent: String(progress ?? 0) })}</Text>
                    </>
                  )}

                  <Button
                    title={t("savings.delete")}
                    variant="danger"
                    loading={deletePot.isPending}
                    onPress={() =>
                      Alert.alert(t("savings.deleteTitle"), t("savings.deleteMessage"), [
                        { text: t("common.cancel"), style: "cancel" },
                        { text: t("common.delete"), style: "destructive", onPress: () => deletePot.mutate(pot.id) },
                      ])
                    }
                  />
                </View>
              </Card>
            );
          })
        )}
      </Section>
    </Screen>
  );
}