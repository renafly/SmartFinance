import { useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { typography } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

import { Page, Card, Section, Field, Button } from '@/components/migrated-page';
import { DropdownMenu, SelectionTrigger } from '@/components/selection-shell';
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
  const [activeMenu, setActiveMenu] = useState<'language' | 'currency' | 'theme' | null>(null);

  const households = householdsQuery.data ?? [];
  const currentHousehold = households.find((item: any) => item.id === householdId) ?? null;
  const canCreateHousehold = !createHousehold.isPending && householdName.trim().length > 0;
  const selectedLanguageLabel =
    t(languageOptions.find((item) => item.value === language)?.labelKey ?? languageOptions[0].labelKey);
  const selectedCurrencyLabel =
    t(currencyOptions.find((item) => item.value === currency)?.labelKey ?? currencyOptions[0].labelKey);
  const selectedThemeLabel =
    t(themeOptions.find((item) => item.value === theme)?.labelKey ?? themeOptions[0].labelKey);

  const languageMenuItems = languageOptions.map((item) => ({
    key: item.value,
    label: t(item.labelKey),
    iconName: item.value === 'en' ? 'language-outline' : 'globe-outline',
    onPress: () => {
      setLanguage(item.value);
      setActiveMenu(null);
    },
  })) as any[];

  const currencyMenuItems = currencyOptions.map((item) => ({
    key: item.value,
    label: t(item.labelKey),
    iconName: 'cash-outline' as const,
    onPress: () => void handleSelectCurrency(item.value),
  })) as any[];

  const themeMenuItems = themeOptions.map((item) => ({
    key: item.value,
    label: t(item.labelKey),
    iconName:
      item.value === 'dark'
        ? ('moon-outline' as const)
        : item.value === 'light'
          ? ('sunny-outline' as const)
          : item.value === 'blue'
            ? ('water-outline' as const)
            : ('settings-outline' as const),
    onPress: () => {
      setTheme(item.value);
      setActiveMenu(null);
    },
  })) as any[];

  async function handleCreateHousehold() {
    if (!householdName.trim()) return;

    await createHousehold.mutateAsync(householdName.trim());
    setHouseholdName('');
  }

  async function handleSelectCurrency(nextCurrency: AppCurrency) {
    setCurrency(nextCurrency);
    setActiveMenu(null);

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
          <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold as any }}>{profile?.full_name ?? t('settings.unnamedUser')}</Text>
          <Text style={{ color: colors.textSecondary }}>{profile?.email ?? t('settings.noEmail')}</Text>
          <Text style={{ color: colors.textSecondary }}>
            {currentHousehold?.name?.trim()
              ? t('settings.currentHousehold', { value: currentHousehold.name.trim() })
              : t('settings.currentHouseholdLabel')}
          </Text>
        </Section>
      </Card>

      <Card>
        <Section title={t('settings.language')} subtitle={t('settings.languageSubtitle')}>
          <SelectionTrigger
            label={t('settings.language')}
            valueLabel={selectedLanguageLabel}
            placeholder={t('settings.languageSubtitle')}
            iconName="language-outline"
            onPress={() => setActiveMenu('language')}
          />
        </Section>
      </Card>

      <Card>
        <Section title={t('settings.currency')} subtitle={t('settings.currencySubtitle')}>
          <SelectionTrigger
            label={t('settings.currency')}
            valueLabel={selectedCurrencyLabel}
            placeholder={t('settings.currencySubtitle')}
            iconName="cash-outline"
            onPress={() => setActiveMenu('currency')}
          />
        </Section>
      </Card>

      <Card>
        <Section title={t('settings.theme')} subtitle={t('settings.themeSubtitle')}>
          <SelectionTrigger
            label={t('settings.theme')}
            valueLabel={selectedThemeLabel}
            placeholder={t('settings.themeSubtitle')}
            iconName="color-palette-outline"
            onPress={() => setActiveMenu('theme')}
          />
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
                    <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold as any, fontSize: typography.fontSize[16] }}>{item.name}</Text>
                    <Text style={{ color: isOwner ? colors.success : colors.primary, fontWeight: typography.fontWeight.semibold as any }}>
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
                      <Text style={{ color: colors.textSecondary } as any}>
                      {t('settings.onlyOwnerHouseholdEdit')}
                    </Text>
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      </Section>

      <DropdownMenu
        visible={activeMenu === 'language'}
        title={t('settings.language')}
        closeLabel={t('cancel')}
        onClose={() => setActiveMenu(null)}
        items={languageMenuItems}
      />

      <DropdownMenu
        visible={activeMenu === 'currency'}
        title={t('settings.currency')}
        closeLabel={t('cancel')}
        onClose={() => setActiveMenu(null)}
        items={currencyMenuItems}
      />

      <DropdownMenu
        visible={activeMenu === 'theme'}
        title={t('settings.theme')}
        closeLabel={t('cancel')}
        onClose={() => setActiveMenu(null)}
        items={themeMenuItems}
      />

    </Page>
  );
}
