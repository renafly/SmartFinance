import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react'
import { queryClient } from '@/shared/lib/react-query/query-client'
import { supabase } from '@/shared/lib/supabase/client'

import {
  AppLanguage,
  DEFAULT_LANGUAGE,
  interpolate,
  normalizeLanguage,
  translations,
  TranslationKey,
} from './translations'

const LANGUAGE_STORAGE_KEY = 'smartfinance.language'

function getLanguageStorageKey(userId?: string) {
  return userId ? `${LANGUAGE_STORAGE_KEY}.${userId}` : LANGUAGE_STORAGE_KEY
}

function patchSessionLanguageCache(userId: string, locale: AppLanguage) {
  queryClient.setQueriesData({ queryKey: ['session'] }, (current: unknown) => {
    if (!current || typeof current !== 'object') return current

    const session = current as {
      profile?: {
        id?: string
        locale?: string | null
      } | null
    }

    if (!session.profile || session.profile.id !== userId) {
      return current
    }

    return {
      ...session,
      profile: {
        ...session.profile,
        locale,
      },
    }
  })
}

type TranslateParams = Record<string, string>

type I18nContextValue = {
  language: AppLanguage
  setLanguage: (language: AppLanguage) => Promise<void>
  t: (key: TranslationKey, params?: TranslateParams) => string
}

export const I18nContext = createContext<I18nContextValue | null>(null)

function getDeviceLocale(): string {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language
  }

  try {
    return Intl.DateTimeFormat().resolvedOptions().locale
  } catch {
    return DEFAULT_LANGUAGE
  }
}

export function I18nProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<AppLanguage>(DEFAULT_LANGUAGE)

  useEffect(() => {
    let isMounted = true

    const loadLanguage = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData.user?.id

      const userScopedStored = await AsyncStorage.getItem(getLanguageStorageKey(userId))
      const legacyStored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)

      let profileLocale: string | null = null

      if (userId) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('locale')
          .eq('id', userId)
          .maybeSingle()

        if (profileError) {
          console.error('Error loading profile locale:', profileError)
        }

        profileLocale = profileData?.locale ?? null
      }

      const resolved = normalizeLanguage(profileLocale ?? userScopedStored ?? legacyStored ?? getDeviceLocale())

      if (isMounted) {
        setLanguageState(resolved)
      }

      if (userId) {
        await AsyncStorage.setItem(getLanguageStorageKey(userId), resolved)
        patchSessionLanguageCache(userId, resolved)

        if (!profileLocale || normalizeLanguage(profileLocale) !== resolved) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ locale: resolved })
            .eq('id', userId)

          if (updateError) {
            console.error('Error saving initial locale to profile:', updateError)
          }
        }
      } else {
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, resolved)
      }
    }

    void loadLanguage()

    return () => {
      isMounted = false
    }
  }, [])

  const setLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage)

    const { data: authData } = await supabase.auth.getUser()
    const userId = authData.user?.id

    if (userId) {
      await AsyncStorage.setItem(getLanguageStorageKey(userId), nextLanguage)
      patchSessionLanguageCache(userId, nextLanguage)

      const { error } = await supabase
        .from('profiles')
        .update({ locale: nextLanguage })
        .eq('id', userId)

      if (error) {
        console.error('Error saving locale preference:', error)
      }

      return
    }

    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
  }, [])

  const t = useCallback((key: TranslationKey, params?: TranslateParams) => {
    const template = translations[language][key] ?? translations[DEFAULT_LANGUAGE][key]
    return interpolate(template, params)
  }, [language])

  const value = useMemo<I18nContextValue>(() => {
    return {
      language,
      setLanguage,
      t,
    }
  }, [language, setLanguage, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
