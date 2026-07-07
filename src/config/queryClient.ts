import { MutationCache, QueryClient } from '@tanstack/react-query';

// Default options + mutation defaults live here, in one place, so every
// query/mutation in SmartFinance inherits sane retry/staleTime
// behavior instead of each call site repeating it.
let queryClient: QueryClient;

queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: async () => {
      await queryClient.invalidateQueries();
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export { queryClient };
