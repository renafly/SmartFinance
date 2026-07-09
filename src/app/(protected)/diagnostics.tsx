import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Card, Page, Section } from '@/components/migrated-page';
import { supabase } from '@/shared/lib/supabase/client';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type DiagnosticStatus = 'ready' | 'warning' | 'error' | 'checking';

type DiagnosticItem = {
  key: string;
  label: string;
  description: string;
  value?: string;
  status: DiagnosticStatus;
};

const STORAGE_BUCKET = 'attachments';
const INVITE_FUNCTION = 'send-household-invitation';

function maskSecret(value: string | undefined, configuredLabel: string) {
  if (!value) return '';
  if (value.length <= 10) return configuredLabel;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function DiagnosticsScreen() {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const [storageStatus, setStorageStatus] = useState<DiagnosticItem | null>(null);
  const [functionStatus, setFunctionStatus] = useState<DiagnosticItem | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const inviteWebUrl = process.env.EXPO_PUBLIC_INVITE_WEB_URL;
  const currentOrigin =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';

  const staticItems = useMemo<DiagnosticItem[]>(
    () => [
      {
        key: 'supabaseUrl',
        label: t('diagnostics.supabaseUrl'),
        description: t('diagnostics.supabaseUrlDescription'),
        value: supabaseUrl,
        status: supabaseUrl ? 'ready' : 'error',
      },
      {
        key: 'supabaseKey',
        label: t('diagnostics.supabaseKey'),
        description: t('diagnostics.supabaseKeyDescription'),
        value: maskSecret(supabaseKey, t('diagnostics.configured')),
        status: supabaseKey ? 'ready' : 'error',
      },
      {
        key: 'inviteWebUrl',
        label: t('diagnostics.inviteWebUrl'),
        description: t('diagnostics.inviteWebUrlDescription'),
        value: inviteWebUrl || currentOrigin || t('diagnostics.notAvailable'),
        status: inviteWebUrl || currentOrigin ? 'ready' : 'warning',
      },
      {
        key: 'oauthOrigin',
        label: t('diagnostics.oauthOrigin'),
        description: t('diagnostics.oauthOriginDescription'),
        value: currentOrigin || t('diagnostics.nativeRuntime'),
        status: Platform.OS === 'web' ? (currentOrigin ? 'ready' : 'warning') : 'ready',
      },
    ],
    [currentOrigin, inviteWebUrl, supabaseKey, supabaseUrl, t],
  );

  const liveItems = [
    storageStatus ?? {
      key: 'storage',
      label: t('diagnostics.storageBucket'),
      description: t('diagnostics.storageBucketDescription', { bucket: STORAGE_BUCKET }),
      status: 'warning' as const,
      value: t('diagnostics.notChecked'),
    },
    functionStatus ?? {
      key: 'inviteFunction',
      label: t('diagnostics.inviteFunction'),
      description: t('diagnostics.inviteFunctionDescription', { functionName: INVITE_FUNCTION }),
      status: 'warning' as const,
      value: t('diagnostics.notChecked'),
    },
  ];

  async function runLiveChecks() {
    setIsChecking(true);
    setStorageStatus({
      key: 'storage',
      label: t('diagnostics.storageBucket'),
      description: t('diagnostics.storageBucketDescription', { bucket: STORAGE_BUCKET }),
      status: 'checking',
      value: t('diagnostics.checking'),
    });
    setFunctionStatus({
      key: 'inviteFunction',
      label: t('diagnostics.inviteFunction'),
      description: t('diagnostics.inviteFunctionDescription', { functionName: INVITE_FUNCTION }),
      status: 'checking',
      value: t('diagnostics.checking'),
    });

    const [{ error: storageError }, functionResult] = await Promise.all([
      supabase.storage.from(STORAGE_BUCKET).list('', { limit: 1 }),
      checkInviteFunction(supabaseUrl),
    ]);

    setStorageStatus({
      key: 'storage',
      label: t('diagnostics.storageBucket'),
      description: t('diagnostics.storageBucketDescription', { bucket: STORAGE_BUCKET }),
      status: storageError ? 'error' : 'ready',
      value: storageError?.message ?? t('diagnostics.reachable'),
    });
    setFunctionStatus(functionResult);
    setIsChecking(false);
  }

  async function checkInviteFunction(url?: string): Promise<DiagnosticItem> {
    const base = url?.replace(/\/$/, '');
    const defaultItem = {
      key: 'inviteFunction',
      label: t('diagnostics.inviteFunction'),
      description: t('diagnostics.inviteFunctionDescription', { functionName: INVITE_FUNCTION }),
    };

    if (!base) {
      return {
        ...defaultItem,
        status: 'error',
        value: t('diagnostics.missingSupabaseUrl'),
      };
    }

    try {
      const response = await fetch(`${base}/functions/v1/${INVITE_FUNCTION}`, {
        method: 'OPTIONS',
      });

      return {
        ...defaultItem,
        status: response.ok ? 'ready' : 'warning',
        value: response.ok
          ? t('diagnostics.reachable')
          : t('diagnostics.httpStatus', { status: response.status }),
      };
    } catch (error) {
      return {
        ...defaultItem,
        status: 'error',
        value: error instanceof Error ? error.message : t('diagnostics.unknownError'),
      };
    }
  }

  return (
    <Page title={t('diagnostics.title')} subtitle={t('diagnostics.subtitle')}>
      <Card>
        <Section
          title={t('diagnostics.configurationTitle')}
          subtitle={t('diagnostics.configurationSubtitle')}
        >
          <View style={styles.grid}>
            {[...staticItems, ...liveItems].map((item) => (
              <DiagnosticRow key={item.key} item={item} />
            ))}
          </View>
          <Pressable
            onPress={() => void runLiveChecks()}
            disabled={isChecking}
            style={({ pressed }) => [
              styles.checkButton,
              {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
                opacity: isChecking ? 0.6 : 1,
              },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="pulse-outline" size={18} color={colors.primaryForeground} />
            <Text style={[styles.checkButtonText, { color: colors.primaryForeground }]}>
              {isChecking ? t('diagnostics.checking') : t('diagnostics.runChecks')}
            </Text>
          </Pressable>
        </Section>
      </Card>
    </Page>
  );
}

function DiagnosticRow({ item }: { item: DiagnosticItem }) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const statusColors: Record<DiagnosticStatus, string> = {
    ready: colors.success,
    warning: colors.warning,
    error: colors.destructive,
    checking: colors.primary,
  };

  return (
    <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
      <View style={styles.rowHeader}>
        <View style={[styles.dot, { backgroundColor: statusColors[item.status] }]} />
        <Text style={[styles.rowTitle, { color: colors.text }]}>{item.label}</Text>
        <Text style={[styles.status, { color: statusColors[item.status] }]}>
          {t(`diagnostics.status.${item.status}`)}
        </Text>
      </View>
      <Text style={[styles.description, { color: colors.textSecondary }]}>{item.description}</Text>
      {item.value ? <Text style={[styles.value, { color: colors.text }]}>{item.value}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing(3),
  },
  row: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing(3),
    gap: spacing(2),
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  dot: {
    width: spacing(2),
    height: spacing(2),
    borderRadius: radius.full,
  },
  rowTitle: {
    flex: 1,
    fontSize: typography.fontSize[15],
    fontWeight: typography.fontWeight.bold,
  },
  status: {
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.extraBold,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
  },
  value: {
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.semibold,
  },
  checkButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  checkButtonText: {
    fontSize: typography.fontSize[14],
    fontWeight: typography.fontWeight.bold,
  },
  pressed: {
    opacity: 0.85,
  },
});
