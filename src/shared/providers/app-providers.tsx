import { PropsWithChildren } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { PaperProvider } from 'react-native-paper'

import { I18nProvider } from '@/shared/i18n'
import { queryClient } from '@/shared/lib/react-query/query-client'
import { paperTheme } from '@/shared/theme'
import AuthProvider from './auth-provider'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <I18nProvider>
      <PaperProvider theme={paperTheme}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      </PaperProvider>
    </I18nProvider>
  )
}