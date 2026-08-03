import type { ImportLocaleOptions } from './types';

export function parseLocalizedNumber(value: string, locale = 'en-US'): number | null {
  let text = value.trim().replace(/\s|\u00a0/g, '').replace(/[^\d,.'()+-]/g, '');
  if (!text) return null;
  const negative = /^\(.*\)$/.test(text) || text.startsWith('-');
  text = text.replace(/[()+-]/g, '').replace(/'/g, '');
  const comma = text.lastIndexOf(',');
  const dot = text.lastIndexOf('.');
  const localeUsesComma = /^((pt|de|es|fr|it|nl)(-|$))/i.test(locale);
  let decimal = comma >= 0 && dot >= 0 ? (comma > dot ? ',' : '.') : comma >= 0 ? ',' : dot >= 0 ? '.' : '';
  if (decimal && text.length - text.lastIndexOf(decimal) - 1 === 3 && !localeUsesComma) decimal = '';
  if (decimal) {
    const parts = text.split(decimal);
    text = `${parts.slice(0, -1).join('').replace(/[.,]/g, '')}.${parts.at(-1)}`;
  } else text = text.replace(/[.,]/g, '');
  const result = Number(text);
  return Number.isFinite(result) ? (negative ? -result : result) : null;
}

export function parseLocalizedDate(value: string, options: ImportLocaleOptions = {}): string | null {
  const text = value.trim();
  const iso = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(text);
  if (iso) return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(text);
  if (!match) return null;
  const order = options.dateOrder ?? (/^en-US/i.test(options.locale ?? '') ? 'mdy' : 'dmy');
  const yearValue = Number(match[3]);
  const year = yearValue < 100 ? 2000 + yearValue : yearValue;
  const first = Number(match[1]);
  const second = Number(match[2]);
  return order === 'mdy' ? validDate(year, first, second) : validDate(year, second, first);
}

function validDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
