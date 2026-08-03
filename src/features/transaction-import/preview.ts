import { parseCsv } from './csv';
import { parseLocalizedDate, parseLocalizedNumber } from './localization';
import type { CsvColumnMapping, ExistingTransactionMatch, ImportLocaleOptions, ImportPreview, ImportTransactionCandidate } from './types';

export function normalizeImportText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function suggestCsvMapping(headers: string[]): Partial<CsvColumnMapping> {
  const aliases: Record<keyof CsvColumnMapping, string[]> = {
    title: ['title', 'description', 'descricao', 'descrição', 'merchant', 'concept'],
    amount: ['amount', 'value', 'valor', 'montante', 'total'],
    date: ['date', 'data', 'transaction date', 'booking date'],
    type: ['type', 'tipo', 'direction', 'debit credit'],
    notes: ['notes', 'memo', 'observacoes', 'observações'],
    category: ['category', 'categoria'],
  };
  const result: Partial<CsvColumnMapping> = {};
  for (const [field, names] of Object.entries(aliases) as [keyof CsvColumnMapping, string[]][]) {
    const found = headers.find((header) => names.includes(normalizeImportText(header)));
    if (found) result[field] = found;
  }
  return result;
}

export function buildImportPreview(input: {
  csv: string;
  mapping: CsvColumnMapping;
  accountId: string;
  existing?: ExistingTransactionMatch[];
  locale?: ImportLocaleOptions;
  delimiter?: string;
}): ImportPreview {
  const document = parseCsv(input.csv, input.delimiter);
  const seen = new Map<string, number>();
  const existing = input.existing ?? [];
  const rows = document.records.map((record, index) => {
    const sourceRow = index + 2;
    const errors: string[] = [];
    const rawAmount = parseLocalizedNumber(record[input.mapping.amount] ?? '', input.locale?.locale);
    const date = parseLocalizedDate(record[input.mapping.date] ?? '', input.locale);
    const title = (record[input.mapping.title] ?? '').trim();
    if (!title) errors.push('title_required');
    if (rawAmount === null || rawAmount === 0) errors.push('amount_invalid');
    if (!date) errors.push('date_invalid');
    const rawType = input.mapping.type ? normalizeImportText(record[input.mapping.type] ?? '') : '';
    const type = inferType(rawType, rawAmount, input.locale?.defaultType);
    if (!type) errors.push('type_invalid');
    if (errors.length || rawAmount === null || !date || !type) return { sourceRow, status: 'invalid' as const, candidate: null, errors, duplicateTransactionId: null, duplicateSourceRow: null };
    const candidate: ImportTransactionCandidate = {
      sourceRow, title, amount: Math.abs(rawAmount), type, transactionDate: date,
      notes: input.mapping.notes ? (record[input.mapping.notes]?.trim() || null) : null,
      categoryName: input.mapping.category ? (record[input.mapping.category]?.trim() || null) : null,
      sourceFingerprint: exactKey(input.accountId, title, Math.abs(rawAmount), type, date),
    };
    const priorRow = seen.get(candidate.sourceFingerprint);
    if (priorRow) return { sourceRow, status: 'exact_duplicate' as const, candidate, errors, duplicateTransactionId: null, duplicateSourceRow: priorRow };
    seen.set(candidate.sourceFingerprint, sourceRow);
    const exact = existing.find((row) => exactKey(row.accountId, row.title, row.amount, row.type, row.transactionDate.slice(0, 10)) === candidate.sourceFingerprint);
    if (exact) return { sourceRow, status: 'exact_duplicate' as const, candidate, errors, duplicateTransactionId: exact.id, duplicateSourceRow: null };
    const probable = existing.find((row) => isProbableDuplicate(input.accountId, candidate, row));
    return { sourceRow, status: probable ? 'probable_duplicate' as const : 'ready' as const, candidate, errors, duplicateTransactionId: probable?.id ?? null, duplicateSourceRow: null };
  });
  const counts = { ready: 0, invalid: 0, exact_duplicate: 0, probable_duplicate: 0 };
  rows.forEach((row) => { counts[row.status] += 1; });
  return { headers: document.headers, rows, counts };
}

function inferType(value: string, amount: number | null, fallback?: 'income' | 'expense') {
  if (['income', 'credit', 'credito', 'cr'].includes(value)) return 'income' as const;
  if (['expense', 'debit', 'debito', 'dr'].includes(value)) return 'expense' as const;
  if (amount !== null && amount < 0) return 'expense' as const;
  return fallback ?? (amount !== null ? 'income' as const : null);
}

function exactKey(accountId: string, title: string, amount: number, type: string, date: string) {
  return `${accountId}|${date}|${amount.toFixed(2)}|${type}|${normalizeImportText(title)}`;
}

function isProbableDuplicate(accountId: string, candidate: ImportTransactionCandidate, existing: ExistingTransactionMatch) {
  if (existing.accountId !== accountId || existing.type !== candidate.type || Math.abs(existing.amount - candidate.amount) > 0.005) return false;
  const days = Math.abs(Date.parse(existing.transactionDate.slice(0, 10)) - Date.parse(candidate.transactionDate)) / 86400000;
  if (days > 3) return false;
  const a = new Set(normalizeImportText(candidate.title).split(' ').filter(Boolean));
  const b = new Set(normalizeImportText(existing.title).split(' ').filter(Boolean));
  const overlap = [...a].filter((token) => b.has(token)).length;
  return overlap / Math.max(a.size, b.size, 1) >= 0.5;
}
