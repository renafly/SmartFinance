import { useMemo } from 'react'

import { useI18n } from './use-i18n'

type CurrencyOptions = {
  currency?: string
  maximumFractionDigits?: number
}

type DateOptions = Intl.DateTimeFormatOptions

export function useFormatters() {
  const { language } = useI18n()

  const formatCurrency = useMemo(() => {
    return (value: number, options?: CurrencyOptions) => {
      const currency = options?.currency ?? 'EUR'
      const maximumFractionDigits = options?.maximumFractionDigits

      return new Intl.NumberFormat(language, {
        style: 'currency',
        currency,
        ...(maximumFractionDigits !== undefined ? { maximumFractionDigits } : {}),
      }).format(value)
    }
  }, [language])

  const formatDate = useMemo(() => {
    return (value: Date | string | null | undefined, options?: DateOptions) => {
      if (!value) return ''

      const date = value instanceof Date ? value : new Date(value)
      if (Number.isNaN(date.getTime())) return ''

      return date.toLocaleDateString(language, options)
    }
  }, [language])

  return {
    formatCurrency,
    formatDate,
    locale: language,
  }
}
