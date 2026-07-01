import { ActivityIndicator, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

import { AccountForm } from '@/features/accounts/components/account-form'
import { useCreateAccount } from '@/features/accounts/hooks'
import { AccountFormValues } from '@/features/accounts/account.schema'
import { useHouseholdMembers } from '@/features/households/hooks'
import { useI18n } from '@/shared/i18n'
import { useSession } from '@/shared/session'
import { colors } from '@/shared/theme'

export default function CreateAccountScreen() {
  const { t } = useI18n()
  const router = useRouter()
  const { mutateAsync, isPending } = useCreateAccount()
  const { data: session, isPending: sessionLoading } = useSession()
  const { data: members = [], isPending: membersLoading } = useHouseholdMembers()

  const householdId = session?.household.id
  const currentUserId = session?.profile.id ?? null

   const onSubmit = async (data: AccountFormValues) => {
     if (!householdId) {
      throw new Error("No household selected");
    }
    
    await mutateAsync({
      name: data.name,
      type: data.type,
      currency: data.currency,
      initial_balance: data.initial_balance, // now typed as number
      household_id: householdId,
      owner_profile_id: data.owner_profile_id ?? null,
    })
    router.back()
  }

  if (sessionLoading || membersLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!householdId) {
    return (
      <View style={{ flex: 1, padding: 20, backgroundColor: colors.background }}>
        <Text style={{ fontSize: 20, marginBottom: 12, fontWeight: '700' }}>{t('accounts.newTitle')}</Text>
        <Text style={{ color: colors.textMuted }}>{t('accounts.noHousehold')}</Text>
      </View>
    )
  }
  
  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 12 }}>
        {t('accounts.newTitle')}
      </Text>

      <AccountForm
        loading={isPending}
        onSubmit={onSubmit}
        defaultValues={{ owner_profile_id: currentUserId ?? undefined }}
        ownerOptions={members.map((member) => ({
          id: member.id,
          label: member.full_name ?? member.id,
        }))}
      />
    </View>
  )
}