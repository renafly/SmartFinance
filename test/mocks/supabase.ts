type QueryResult = {
  data?: unknown;
  error?: unknown;
};

export function createSupabaseQuery(result: QueryResult = {}) {
  const query: Record<string, jest.Mock> = {};
  const chain = () => query;

  [
    'select',
    'eq',
    'neq',
    'gte',
    'lte',
    'order',
    'range',
    'insert',
    'update',
    'delete',
    'single',
    'maybeSingle',
    'in',
    'limit',
  ].forEach((method) => {
    query[method] = jest.fn(chain);
  });

  query.then = jest.fn((resolve: (value: QueryResult) => unknown) =>
    Promise.resolve(resolve({ data: result.data ?? null, error: result.error ?? null })),
  );

  return query;
}

export function createSupabaseMock(tableResults: Record<string, QueryResult> = {}) {
  return {
    from: jest.fn((table: string) => createSupabaseQuery(tableResults[table])),
    rpc: jest.fn(async () => ({ data: null, error: null })),
    storage: {
      from: jest.fn(() => ({
        list: jest.fn(async () => ({ data: [], error: null })),
        upload: jest.fn(async () => ({ data: { path: 'test/path' }, error: null })),
        remove: jest.fn(async () => ({ data: null, error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'http://localhost/file.pdf' } })),
      })),
    },
    auth: {
      getUser: jest.fn(async () => ({ data: { user: null }, error: null })),
    },
    functions: {
      invoke: jest.fn(async () => ({ data: null, error: null })),
    },
  };
}
