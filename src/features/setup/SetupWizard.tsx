import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { Card, Field, Button, Pill, formatCurrency } from "@/components/migrated-page";
import { useAuth } from "@/providers/AuthProvider";
import { usePreferencesStore, type AppCurrency } from "@/stores/preferencesStore";
import type { AppLanguage } from "@/shared/i18n/languages";
import {
  useCreateHousehold,
  useMyHouseholdInvitations,
  useAcceptHouseholdInvitation,
  useDeclineHouseholdInvitation,
} from "@/features/households/hooks";
import {
  useUpdateFullName,
  useUpdatePreferredCurrency,
  useUpdateLocale,
} from "@/features/profiles/hooks";
import { useCreateAccount } from "@/features/accounts/hooks";
import { ACCOUNT_TYPE_ORDER } from "@/features/accounts/account-ordering";

type WizardStep = "household" | "profile" | "accounts" | "done";

const STEP_ORDER: WizardStep[] = ["household", "profile", "accounts", "done"];
const currencyOptions: AppCurrency[] = ["EUR", "USD", "GBP"];
const languageOptions: { value: AppLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "pt", label: "Português" },
];

type AddedAccount = {
  id: string;
  name: string;
  type: (typeof ACCOUNT_TYPE_ORDER)[number];
  currency: AppCurrency;
  initial_balance: number;
};

export function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation("common");
  const { profile } = useAuth();
  const preferredCurrency = usePreferencesStore((state) => state.currency);
  const preferredLanguage = usePreferencesStore((state) => state.language);
  const setStoreCurrency = usePreferencesStore((state) => state.setCurrency);
  const setStoreLanguage = usePreferencesStore((state) => state.setLanguage);

  const [step, setStep] = useState<WizardStep>("household");
  const [createdHouseholdId, setCreatedHouseholdId] = useState<string | null>(null);
  const [createdHouseholdName, setCreatedHouseholdName] = useState<string>("");

  // Step 1 -- household
  const [householdName, setHouseholdName] = useState("");
  const [householdError, setHouseholdError] = useState<string | null>(null);
  const myInvitationsQuery = useMyHouseholdInvitations();
  const acceptInvitation = useAcceptHouseholdInvitation();
  const declineInvitation = useDeclineHouseholdInvitation();
  const createHousehold = useCreateHousehold();

  // Step 2 -- profile
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [currency, setCurrency] = useState<AppCurrency>(preferredCurrency);
  const [language, setLanguage] = useState<AppLanguage>(preferredLanguage);
  const [profileError, setProfileError] = useState<string | null>(null);
  const updateFullName = useUpdateFullName();
  const updatePreferredCurrency = useUpdatePreferredCurrency();
  const updateLocale = useUpdateLocale();
  const savingProfile = updateFullName.isPending || updatePreferredCurrency.isPending || updateLocale.isPending;

  // Step 3 -- accounts
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<(typeof ACCOUNT_TYPE_ORDER)[number]>("bank");
  const [accountCurrency, setAccountCurrency] = useState<AppCurrency>(preferredCurrency);
  const [accountBalance, setAccountBalance] = useState("0");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [addedAccounts, setAddedAccounts] = useState<AddedAccount[]>([]);
  const createAccount = useCreateAccount();

  const stepIndex = STEP_ORDER.indexOf(step);

  async function handleAcceptInvitation(token: string, name: string) {
    setHouseholdError(null);
    try {
      await acceptInvitation.mutateAsync(token);
      setCreatedHouseholdName(name);
      setStep("profile");
    } catch (error) {
      setHouseholdError(error instanceof Error ? error.message : t("setup.household.error"));
    }
  }

  async function handleCreateHousehold() {
    if (!householdName.trim()) {
      setHouseholdError(t("setup.household.error"));
      return;
    }

    setHouseholdError(null);
    try {
      const household = await createHousehold.mutateAsync(householdName.trim());
      setCreatedHouseholdId(household.id);
      setCreatedHouseholdName(household.name);
      setStep("profile");
    } catch (error) {
      setHouseholdError(error instanceof Error ? error.message : t("setup.household.error"));
    }
  }

  async function handleProfileContinue() {
    if (!profile?.id) return;

    if (!fullName.trim()) {
      setProfileError(t("setup.profile.nameError"));
      return;
    }

    setProfileError(null);
    setStoreCurrency(currency);
    setStoreLanguage(language);

    const updates: Promise<unknown>[] = [];
    if (fullName.trim() !== (profile.full_name ?? "").trim()) {
      updates.push(updateFullName.mutateAsync({ profileId: profile.id, fullName: fullName.trim() }));
    }
    if (profile.preferred_currency !== currency) {
      updates.push(updatePreferredCurrency.mutateAsync({ profileId: profile.id, currency }));
    }
    if (profile.locale !== language) {
      updates.push(updateLocale.mutateAsync({ profileId: profile.id, locale: language }));
    }

    await Promise.all(updates);
    setStep("accounts");
  }

  async function handleAddAccount() {
    if (!createdHouseholdId || !profile?.id) return;

    if (!accountName.trim()) {
      setAccountError(t("setup.accounts.nameError"));
      return;
    }

    const parsedBalance = Number(accountBalance);
    if (!Number.isFinite(parsedBalance) || parsedBalance < 0) {
      setAccountError(t("setup.accounts.balanceError"));
      return;
    }

    setAccountError(null);
    const created = await createAccount.mutateAsync({
      household_id: createdHouseholdId,
      owner_profile_id: profile.id,
      name: accountName.trim(),
      type: accountType,
      currency: accountCurrency,
      initial_balance: parsedBalance,
    });

    setAddedAccounts((current) => [
      ...current,
      {
        id: (created as any)?.id ?? String(current.length),
        name: accountName.trim(),
        type: accountType,
        currency: accountCurrency,
        initial_balance: parsedBalance,
      },
    ]);
    setAccountName("");
    setAccountBalance("0");
  }

  const styles = {
    shell: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingHorizontal: spacing(4), paddingTop: insets.top + spacing(6), paddingBottom: insets.bottom + spacing(6), gap: spacing(4) },
    stepLabel: { color: colors.textSecondary, fontSize: 13 },
    title: { color: colors.text, fontSize: 24, fontWeight: String(typography.fontWeight.bold) as any, marginTop: spacing(1) },
    subtitle: { color: colors.textSecondary, fontSize: 14, marginTop: spacing(1) },
    sectionLabel: { color: colors.textSecondary, fontSize: 13, marginTop: spacing(3), marginBottom: spacing(1) },
    pillWrap: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: spacing(2) },
    error: { color: colors.destructive, marginTop: spacing(2) },
    divider: { color: colors.textSecondary, textAlign: "center" as const, marginVertical: spacing(3) },
    row: { flexDirection: "row" as const, gap: spacing(2), marginTop: spacing(3) },
  };

  return (
    <View style={styles.shell}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.stepLabel}>
          {t("setup.stepLabel", { current: stepIndex + 1, total: STEP_ORDER.length })}
        </Text>

        {step === "household" ? (
          <>
            <Text style={styles.title}>{t("setup.household.title")}</Text>
            <Text style={styles.subtitle}>{t("setup.household.subtitle")}</Text>

            {(myInvitationsQuery.data ?? []).length > 0 ? (
              <Card>
                <Text style={[styles.title, { fontSize: 17 }]}>{t("setup.household.invitationsTitle")}</Text>
                <Text style={styles.subtitle}>{t("setup.household.invitationsSubtitle")}</Text>
                {(myInvitationsQuery.data ?? []).map((invite: any) => (
                  <View key={invite.id} style={{ marginTop: spacing(3), gap: spacing(1) }}>
                    <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) as any }}>
                      {invite.household_name}
                    </Text>
                    <View style={styles.row}>
                      <Button
                        label={acceptInvitation.isPending ? t("saving", { defaultValue: "..." }) : t("setup.household.accept")}
                        onPress={() => void handleAcceptInvitation(invite.token, invite.household_name)}
                        disabled={acceptInvitation.isPending}
                      />
                      <Button
                        label={t("setup.household.decline")}
                        variant="secondary"
                        onPress={() => void declineInvitation.mutateAsync(invite.token)}
                        disabled={declineInvitation.isPending}
                      />
                    </View>
                  </View>
                ))}
              </Card>
            ) : null}

            {(myInvitationsQuery.data ?? []).length > 0 ? (
              <Text style={styles.divider}>{t("setup.household.orDivider")}</Text>
            ) : null}

            <Card>
              <Text style={[styles.title, { fontSize: 17 }]}>{t("setup.household.createTitle")}</Text>
              <Text style={styles.subtitle}>{t("setup.household.createSubtitle")}</Text>
              <View style={{ marginTop: spacing(3) }}>
                <Field
                  label={t("accounts.name", { defaultValue: "Name" })}
                  value={householdName}
                  onChangeText={setHouseholdName}
                  placeholder={t("setup.household.namePlaceholder")}
                />
              </View>
              {householdError ? <Text style={styles.error}>{householdError}</Text> : null}
              <View style={styles.row}>
                <Button
                  label={createHousehold.isPending ? t("creating", { defaultValue: "..." }) : t("setup.household.create")}
                  onPress={() => void handleCreateHousehold()}
                  disabled={createHousehold.isPending || !householdName.trim()}
                />
              </View>
            </Card>
          </>
        ) : null}

        {step === "profile" ? (
          <>
            <Text style={styles.title}>{t("setup.profile.title")}</Text>
            <Text style={styles.subtitle}>{t("setup.profile.subtitle")}</Text>

            <Card>
              <Field
                label={t("setup.profile.nameLabel")}
                value={fullName}
                onChangeText={setFullName}
                placeholder={t("setup.profile.namePlaceholder")}
              />

              <Text style={styles.sectionLabel}>{t("setup.profile.currencyLabel")}</Text>
              <View style={styles.pillWrap}>
                {currencyOptions.map((item) => (
                  <Pill key={item} label={item} active={currency === item} onPress={() => setCurrency(item)} />
                ))}
              </View>

              <Text style={styles.sectionLabel}>{t("setup.profile.languageLabel")}</Text>
              <View style={styles.pillWrap}>
                {languageOptions.map((item) => (
                  <Pill
                    key={item.value}
                    label={item.label}
                    active={language === item.value}
                    onPress={() => setLanguage(item.value)}
                  />
                ))}
              </View>

              {profileError ? <Text style={styles.error}>{profileError}</Text> : null}
              <View style={styles.row}>
                <Button
                  label={savingProfile ? t("saving", { defaultValue: "..." }) : t("setup.profile.continue")}
                  onPress={() => void handleProfileContinue()}
                  disabled={savingProfile || !fullName.trim()}
                />
              </View>
            </Card>
          </>
        ) : null}

        {step === "accounts" ? (
          <>
            <Text style={styles.title}>{t("setup.accounts.title")}</Text>
            <Text style={styles.subtitle}>{t("setup.accounts.subtitle")}</Text>

            {addedAccounts.length > 0 ? (
              <Card>
                <Text style={[styles.title, { fontSize: 17 }]}>{t("setup.accounts.addedTitle")}</Text>
                {addedAccounts.map((account) => (
                  <View
                    key={account.id}
                    style={{ flexDirection: "row", justifyContent: "space-between", marginTop: spacing(2) }}
                  >
                    <Text style={{ color: colors.text }}>
                      {account.name} · {t(`accounts.types.${account.type}`)}
                    </Text>
                    <Text style={{ color: colors.textSecondary }}>
                      {formatCurrency(account.initial_balance)}
                    </Text>
                  </View>
                ))}
              </Card>
            ) : null}

            <Card>
              <Field
                label={t("accounts.name", { defaultValue: "Name" })}
                value={accountName}
                onChangeText={setAccountName}
                placeholder={t("setup.accounts.namePlaceholder")}
              />

              <Text style={styles.sectionLabel}>{t("setup.accounts.typeLabel")}</Text>
              <View style={styles.pillWrap}>
                {ACCOUNT_TYPE_ORDER.map((item) => (
                  <Pill
                    key={item}
                    label={t(`accounts.types.${item}`)}
                    active={accountType === item}
                    onPress={() => setAccountType(item)}
                  />
                ))}
              </View>

              <Text style={styles.sectionLabel}>{t("setup.accounts.currencyLabel")}</Text>
              <View style={styles.pillWrap}>
                {currencyOptions.map((item) => (
                  <Pill key={item} label={item} active={accountCurrency === item} onPress={() => setAccountCurrency(item)} />
                ))}
              </View>

              <View style={{ marginTop: spacing(3) }}>
                <Field
                  label={t("setup.accounts.balanceLabel")}
                  value={accountBalance}
                  onChangeText={setAccountBalance}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              {accountError ? <Text style={styles.error}>{accountError}</Text> : null}
              <View style={styles.row}>
                <Button
                  label={createAccount.isPending ? t("creating", { defaultValue: "..." }) : t("setup.accounts.add")}
                  variant="secondary"
                  onPress={() => void handleAddAccount()}
                  disabled={createAccount.isPending}
                />
              </View>
            </Card>

            <View style={styles.row}>
              <Button
                label={addedAccounts.length > 0 ? t("setup.accounts.continue") : t("setup.accounts.skip")}
                onPress={() => setStep("done")}
              />
            </View>
          </>
        ) : null}

        {step === "done" ? (
          <>
            <Ionicons name="checkmark-circle" size={48} color={colors.primary} />
            <Text style={styles.title}>{t("setup.done.title")}</Text>
            <Text style={styles.subtitle}>
              {t("setup.done.subtitle", { household: createdHouseholdName })}
            </Text>
            <View style={styles.row}>
              <Button label={t("setup.done.cta")} onPress={onComplete} />
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
