export type CsvColumnMapping = {
  title: string;
  amount: string;
  date: string;
  type?: string;
  notes?: string;
  category?: string;
};

export type ImportTransactionCandidate = {
  sourceRow: number;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  transactionDate: string;
  notes: string | null;
  categoryName: string | null;
  sourceFingerprint: string;
};

export type ExistingTransactionMatch = {
  id: string;
  accountId: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  transactionDate: string;
};

export type ImportPreviewRow = {
  sourceRow: number;
  status: 'ready' | 'invalid' | 'exact_duplicate' | 'probable_duplicate';
  candidate: ImportTransactionCandidate | null;
  errors: string[];
  duplicateTransactionId: string | null;
  duplicateSourceRow: number | null;
};

export type ImportPreview = {
  headers: string[];
  rows: ImportPreviewRow[];
  counts: Record<ImportPreviewRow['status'], number>;
};

export type ImportLocaleOptions = {
  locale?: string;
  dateOrder?: 'dmy' | 'mdy' | 'ymd';
  defaultType?: 'income' | 'expense';
};
