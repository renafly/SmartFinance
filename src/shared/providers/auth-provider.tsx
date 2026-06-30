import { AuthContext } from '../hooks/use-auth-context'
import { supabase } from '../lib/supabase/client'
import { PropsWithChildren, useEffect, useState } from 'react'

export default function AuthProvider({ children }: PropsWithChildren) {
  const [claims, setClaims] = useState<Record<string, any> | undefined | null>()
  const [profile, setProfile] = useState<any>()
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Fetch the claims once, and subscribe to auth state changes
  useEffect(() => {
    const fetchClaims = async () => {
      setIsLoading(true)

      const { data, error } = await supabase.auth.getClaims()

      if (error) {
        console.error('Error fetching claims:', error)
      }

      setClaims(data?.claims ?? null)
      setIsLoading(false)
    }

    fetchClaims()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, _session) => {
      const { data } = await supabase.auth.getClaims()
      setClaims(data?.claims ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Fetch the profile and household when claims change
  useEffect(() => {
    const fetchProfileAndHousehold = async () => {
      setIsLoading(true)

      if (claims) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', claims.sub)
          .single()

        setProfile(profileData)

        const { data: membershipData, error: membershipError } = await supabase
          .from('household_members')
          .select('household_id')
          .eq('user_id', claims.sub)
          .single()

        if (membershipError) {
          console.error('Error fetching household membership:', membershipError)
        }

        setHouseholdId(membershipData?.household_id ?? null)
      } else {
        setProfile(null)
        setHouseholdId(null)
      }

      setIsLoading(false)
    }

    fetchProfileAndHousehold()
  }, [claims])

  return (
    <AuthContext.Provider
      value={{
        claims,
        isLoading,
        profile,
        householdId,
        isLoggedIn: claims != undefined,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}