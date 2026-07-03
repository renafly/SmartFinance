import { createContext, useContext } from 'react'

export type AuthData = {
  claims?: Record<string, any> | null
  profile?: any | null
  isLoading: boolean
  isLoggedIn: boolean
  householdId: string | null
}

export const AuthContext = createContext<AuthData>({
  claims: undefined,
  profile: undefined,
  isLoading: true,
  householdId: null,
  isLoggedIn: false,
})

export const useAuthContext = () => useContext(AuthContext)