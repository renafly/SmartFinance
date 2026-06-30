import { useQuery } from '@tanstack/react-query'
import { useAuthContext } from '@/shared/hooks/use-auth-context'
import { sessionService } from './session.service'

export function useSession() {
  const { profile } = useAuthContext()

  return useQuery({
    queryKey: ['session', profile?.id],
    queryFn: () => sessionService.load(profile!),
    enabled: !!profile,
    staleTime: 1000 * 60 * 10,
  })
}