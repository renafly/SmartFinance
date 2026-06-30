import { View, Text } from 'react-native'
import { useRouter } from 'expo-router'
import { useCreateAccount } from '@/features/accounts/hooks'
import { AccountForm } from '@/features/accounts/components/account-form'
import { useAuthContext } from '@/shared/hooks/use-auth-context' // match your actual path
import { AccountFormValues } from '@/features/accounts/account.schema'

export default function CreateAccountScreen() {
  const router = useRouter()
  const { mutateAsync, isPending } = useCreateAccount()
  const { householdId } = useAuthContext()

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
    })
    router.back()
  }
  
  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 12 }}>
        New Account
      </Text>

      <AccountForm
        loading={isPending}
        onSubmit={onSubmit}
      />
    </View>
  )
}