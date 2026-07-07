import { useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { typography } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

import { Page, Card, Section, Field, Button } from '@/components/migrated-page';
import { useAuth } from '../../providers/AuthProvider';
import { usePreferencesStore, type AppCurrency } from '@/stores/preferencesStore';
import {
  useCreateHousehold,
  useDefaultHousehold,
  useDeleteHousehold,
  useMyHouseholds,
  useUpdateHousehold,
} from '../../features/households/hooks';
import type { AppLanguage } from '@/shared/i18n/languages';
import { useUpdatePreferredCurrency } from '@/features/profiles/hooks';
import type { ThemeMode } from '@/stores/themeStore';
import { useThemeStore } from '@/stores/themeStore';

const languageOptions: { value: AppLanguage; labelKey: string }[] = [
  { value: 'en', labelKey: 'settings.languageEnglish' },
  { value: 'pt', labelKey: 'settings.languagePortuguese' },
];

const currencyOptions: { value: AppCurrency; labelKey: string }[] = [
  { value: 'EUR', labelKey: 'settings.currencyEuro' },
  { value: 'USD', labelKey: 'settings.currencyUsd' },
  { value: 'GBP', labelKey: 'settings.currencyGbp' },
];

const themeOptions: { value: ThemeMode; labelKey: string }[] = [
  { value: 'dark', labelKey: 'settings.themeDark' },
  { value: 'light', labelKey: 'settings.themeWhite' },
  { value: 'blue', labelKey: 'settings.themeBlue' },
  { value: 'system', labelKey: 'settings.themeSystem' },
];

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const { profile, householdId } = useAuth();
  const language = usePreferencesStore((state) => state.language);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);
  const currency = usePreferencesStore((state) => state.currency);
  const setCurrency = usePreferencesStore((state) => state.setCurrency);
  const theme = useThemeStore((state) => state.mode);
  const setTheme = useThemeStore((state) => state.setMode);
  const householdsQuery = useMyHouseholds();
  const createHousehold = useCreateHousehold();
  const defaultHousehold = useDefaultHousehold();
  const updateHousehold = useUpdateHousehold();
  const deleteHousehold = useDeleteHousehold();
  const updatePreferredCurrency = useUpdatePreferredCurrency();
  const [householdName, setHouseholdName] = useState('');
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);

  const households = householdsQuery.data ?? [];
  const canCreateHousehold = !createHousehold.isPending && householdName.trim().length > 0;
  const selectedLanguageLabel =
    t(languageOptions.find((item) => item.value === language)?.labelKey ?? languageOptions[0].labelKey);
  const selectedCurrencyLabel =
    t(currencyOptions.find((item) => item.value === currency)?.labelKey ?? currencyOptions[0].labelKey);
  const selectedThemeLabel =
    t(themeOptions.find((item) => item.value === theme)?.labelKey ?? themeOptions[0].labelKey);

  async function handleCreateHousehold() {
    if (!householdName.trim()) return;

    await createHousehold.mutateAsync(householdName.trim());
    setHouseholdName('');
  }

  async function handleSelectCurrency(nextCurrency: AppCurrency) {
    setCurrency(nextCurrency);
    setCurrencyMenuOpen(false);

    if (!profile?.id || profile.preferred_currency === nextCurrency) return;

    await updatePreferredCurrency.mutateAsync({
      profileId: profile.id,
      currency: nextCurrency,
    });
  }

  async function handleSaveHousehold(item: { id: string; name: string }) {
    const nextName = (draftNames[item.id] ?? item.name).trim();

    if (!nextName || nextName === item.name) return;

    await updateHousehold.mutateAsync({ householdId: item.id, name: nextName });
    setDraftNames((current) => ({
      ...current,
      [item.id]: nextName,
    }));
  }

  async function handleDeleteHousehold(item: { id: string; name: string }) {
    const message = t('settings.deleteHouseholdMessage');

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm(message) : false;

      if (!confirmed) return;

      await deleteHousehold.mutateAsync(item.id);
      setDraftNames((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      return;
    }

    Alert.alert(t('settings.deleteHouseholdTitle'), message, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => {
          void deleteHousehold.mutateAsync(item.id).then(() => {
            setDraftNames((current) => {
              const next = { ...current };
              delete next[item.id];
              return next;
            });
          });
        },
      },
    ]);
  }

  return (
    <Page title={t('settings.title')} subtitle={t('settings.householdManagement')}>
      <Card>
        <Section title={t('settings.profile')}>
          <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold }}>{profile?.full_name ?? t('settings.unnamedUser')}</Text>
          <Text style={{ color: colors.textSecondary }}>{profile?.email ?? t('settings.noEmail')}</Text>
          <Text style={{ color: colors.textSecondary }}>{t('settings.currentHousehold', { value: householdId ?? t('settings.none') })}</Text>
        </Section>
      </Card>

      <Card>
        <Section title={t('settings.language')} subtitle={t('settings.languageSubtitle')}>
          <Pressable
            onPress={() => setLanguageMenuOpen((current) => !current)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing(3.5),
              paddingVertical: spacing(3),
              borderRadius: radius.mdPlus,
              backgroundColor: colors.surfaceMuted,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold }}>{selectedLanguageLabel}</Text>
            <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.bold }}>{languageMenuOpen ? '▴' : '▾'}</Text>
          </Pressable>

          {languageMenuOpen ? (
            <View style={{ gap: spacing(2) }}>
              {languageOptions.map((item) => {
                const isActive = item.value === language;

                return (
                  <Pressable
                    key={item.value}
                    onPress={() => {
                      setLanguage(item.value);
                      setLanguageMenuOpen(false);
                    }}
                    style={{
                      paddingHorizontal: spacing(3.5),
                      paddingVertical: spacing(3),
                      borderRadius: radius.mdPlus,
                      backgroundColor: isActive ? colors.primary : colors.surfaceMuted,
                      borderWidth: 1,
                      borderColor: isActive ? colors.primary : colors.border,
                    }}
                  >
                    <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold }}>{t(item.labelKey)}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </Section>
      </Card>

      <Card>
        <Section title={t('settings.currency')} subtitle={t('settings.currencySubtitle')}>
          <Pressable
            onPress={() => setCurrencyMenuOpen((current) => !current)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing(3.5),
              paddingVertical: spacing(3),
              borderRadius: radius.mdPlus,
              backgroundColor: colors.surfaceMuted,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold }}>{selectedCurrencyLabel}</Text>
            <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.bold }}>{currencyMenuOpen ? '▴' : '▾'}</Text>
          </Pressable>

          {currencyMenuOpen ? (
            <View style={{ gap: spacing(2) }}>
              {currencyOptions.map((item) => {
                const isActive = item.value === currency;

                return (
                  <Pressable
                    key={item.value}
                    onPress={() => void handleSelectCurrency(item.value)}
                    style={{
                      paddingHorizontal: spacing(3.5),
                      paddingVertical: spacing(3),
                      borderRadius: radius.mdPlus,
                      backgroundColor: isActive ? colors.primary : colors.surfaceMuted,
                      borderWidth: 1,
                      borderColor: isActive ? colors.primary : colors.border,
                    }}
                  >
                    <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold }}>{t(item.labelKey)}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </Section>
      </Card>

      <Card>
        <Section title={t('settings.theme')} subtitle={t('settings.themeSubtitle')}>
          <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold }}>{selectedThemeLabel}</Text>
          <View style={{ gap: spacing(2) }}>
            {themeOptions.map((item) => {
              const isActive = item.value === theme;

              return (
                <Pressable
                  key={item.value}
                  onPress={() => setTheme(item.value)}
                  style={{
                    paddingHorizontal: spacing(3.5),
                    paddingVertical: spacing(3),
                    borderRadius: radius.mdPlus,
                    backgroundColor: isActive ? colors.primary : colors.surfaceMuted,
                    borderWidth: 1,
                    borderColor: isActive ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold }}>{t(item.labelKey)}</Text>
                </Pressable>
              );
            })}
          </View>
        </Section>
      </Card>

      <Card>
        <Section title={t('settings.createHousehold')} subtitle={t('settings.createHouseholdSubtitle')}>
          <Field label={t('settings.householdName')} value={householdName} onChangeText={setHouseholdName} placeholder={t('settings.householdPlaceholder')} />
          <Button
            label={createHousehold.isPending ? t('creating') : t('settings.createHousehold')}
            onPress={() => void handleCreateHousehold()}
            disabled={!canCreateHousehold}
          />
        </Section>
      </Card>

      <Section
        title={t('settings.myHouseholds')}
        subtitle={t('settings.myHouseholdsSubtitle')}
      >
        <View style={{ gap: spacing(3) }}>
          {households.map((item: any) => {
            const draftName = draftNames[item.id] ?? item.name;
            const isOwner = item.role === 'owner';
            const isCurrent = householdId === item.id;
            const canSave =
              isOwner && !updateHousehold.isPending && draftName.trim().length > 0 && draftName.trim() !== item.name;

            return (
              <Card key={item.id}>
                <View style={{ gap: spacing(2.5) }}>
                  <View style={{ gap: spacing(1) }}>
                    <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize[16] }}>{item.name}</Text>
                    <Text style={{ color: colors.textSecondary }}>{item.id}</Text>
                    <Text style={{ color: isOwner ? colors.success : colors.primary, fontWeight: typography.fontWeight.semibold }}>
                      {isOwner ? t('settings.owner') : t('settings.member')}
                      {isCurrent ? ` · ${t('settings.currentHouseholdLabel')}` : ''}
                    </Text>
                  </View>

                  {isOwner ? (
                    <>
                      <Field
                        label={t('settings.householdName')}
                        value={draftName}
                        onChangeText={(value) =>
                          setDraftNames((current) => ({
                            ...current,
                            [item.id]: value,
                          }))
                        }
                        placeholder={t('settings.householdName')}
                      />

                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2.5) }}>
                        <Button
                          label={updateHousehold.isPending ? t('saving') : t('settings.saveChanges')}
                          onPress={() => void handleSaveHousehold(item)}
                          disabled={!canSave}
                        />
                        <Button
                          label={defaultHousehold.isPending ? t('setting') : t('settings.setDefault')}
                          onPress={() => void defaultHousehold.mutateAsync(item.id)}
                          variant="secondary"
                          disabled={isCurrent || defaultHousehold.isPending}
                        />
                        <Button
                          label={deleteHousehold.isPending ? t('deleting') : t('settings.deleteHousehold')}
                          onPress={() => void handleDeleteHousehold(item)}
                          variant="danger"
                          disabled={deleteHousehold.isPending}
                        />
                      </View>
                    </>
                  ) : (
                    <Text style={{ color: colors.textSecondary }}>
                      {t('settings.onlyOwnerHouseholdEdit')}
                    </Text>
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      </Section>

    </Page>
  );
}
