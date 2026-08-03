import { buildImportPreview, calculateReconciliation, parseCsv, parseLocalizedDate, parseLocalizedNumber, suggestCsvMapping } from '.';

describe('transaction import', () => {
  test('parses BOM, quoted delimiters, escaped quotes and multiline values', () => {
    expect(parseCsv('\uFEFFDate;Description;Amount\r\n31/07/2026;"Shop; Lisbon";"1.234,56"\r\n30/07/2026;"Say ""Hi""\nagain";-12,50')).toEqual({
      headers: ['Date', 'Description', 'Amount'],
      records: [
        { Date: '31/07/2026', Description: 'Shop; Lisbon', Amount: '1.234,56' },
        { Date: '30/07/2026', Description: 'Say "Hi"\nagain', Amount: '-12,50' },
      ],
    });
  });

  test('rejects malformed quoted CSV', () => expect(() => parseCsv('a,b\n"open,b')).toThrow('unterminated'));

  test.each([
    ['1.234,56', 'pt-PT', 1234.56],
    ['€ (1 234,56)', 'pt-PT', -1234.56],
    ['1,234.56', 'en-US', 1234.56],
    ["1'234.50", 'en-US', 1234.5],
  ])('parses localized number %s', (value, locale, expected) => expect(parseLocalizedNumber(value, locale)).toBe(expected));

  test.each([
    ['31/07/2026', { locale: 'pt-PT' }, '2026-07-31'],
    ['07/31/2026', { locale: 'en-US' }, '2026-07-31'],
    ['2026-07-31', {}, '2026-07-31'],
    ['31/02/2026', { locale: 'pt-PT' }, null],
  ])('parses localized date %s', (value, options, expected) => expect(parseLocalizedDate(value, options)).toBe(expected));

  test('suggests mappings from localized and common bank headers', () => {
    expect(suggestCsvMapping(['Data', 'Descrição', 'Montante', 'Observações'])).toEqual({ date: 'Data', title: 'Descrição', amount: 'Montante', notes: 'Observações' });
  });

  test('classifies invalid, within-file exact, existing exact, probable and ready rows', () => {
    const preview = buildImportPreview({
      csv: 'Data;Descrição;Valor\n31/07/2026;Coffee;-3,50\n31/07/2026;Coffee;-3,50\n30/07/2026;Coffee shop;-3,50\n31/07/2026;Rent;-900,00\nbad;Missing;',
      mapping: { date: 'Data', title: 'Descrição', amount: 'Valor' }, accountId: 'account-1', locale: { locale: 'pt-PT' },
      existing: [
        { id: 'exact', accountId: 'account-1', title: 'Coffee', amount: 3.5, type: 'expense', transactionDate: '2026-07-31T12:00:00Z' },
        { id: 'probable', accountId: 'account-1', title: 'Coffee downtown shop', amount: 3.5, type: 'expense', transactionDate: '2026-07-29T12:00:00Z' },
      ],
    });
    expect(preview.rows.map((row) => row.status)).toEqual(['exact_duplicate', 'exact_duplicate', 'probable_duplicate', 'ready', 'invalid']);
    expect(preview.rows[1].duplicateSourceRow).toBe(2);
    expect(preview.counts).toEqual({ ready: 1, invalid: 1, exact_duplicate: 2, probable_duplicate: 1 });
  });

  test('keeps same amount/date/title on another account importable', () => {
    const preview = buildImportPreview({ csv: 'date,title,amount\n2026-07-31,Coffee,-3.50', mapping: { date: 'date', title: 'title', amount: 'amount' }, accountId: 'a', existing: [{ id: 'x', accountId: 'b', title: 'Coffee', amount: 3.5, type: 'expense', transactionDate: '2026-07-31' }] });
    expect(preview.rows[0].status).toBe('ready');
  });

  test('calculates reconciliation with a configurable tolerance', () => {
    expect(calculateReconciliation({ statementBalance: 100, ledgerBalance: 99.99 })).toEqual({ difference: 0.01, reconciled: true });
    expect(calculateReconciliation({ statementBalance: 100, ledgerBalance: 90 })).toEqual({ difference: 10, reconciled: false });
  });
});
