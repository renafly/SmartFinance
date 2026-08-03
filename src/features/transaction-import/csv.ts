export type CsvDocument = { headers: string[]; records: Record<string, string>[] };

export function parseCsv(input: string, delimiter?: string): CsvDocument {
  const text = input.replace(/^\uFEFF/, '');
  const resolvedDelimiter = delimiter ?? detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === resolvedDelimiter) {
      row.push(field.trim());
      field = '';
    } else if (char === '\n') {
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') field += char;
  }
  if (quoted) throw new Error('CSV contains an unterminated quoted field.');
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  if (!rows.length) return { headers: [], records: [] };

  const headers = rows[0].map((value, index) => value || `column_${index + 1}`);
  const records = rows.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])),
  );
  return { headers, records };
}

function detectDelimiter(text: string): string {
  const firstRecord = text.split(/\r?\n/, 1)[0] ?? '';
  const candidates = [',', ';', '\t'];
  return candidates.reduce((best, candidate) =>
    firstRecord.split(candidate).length > firstRecord.split(best).length ? candidate : best,
  );
}
