
import { QueryClient, isServer } from '@tanstack/react-query';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: () => {
          // todo retry
          return false;
        }
      },
    },
  });
}

let queryClient: QueryClient | null = null;

export function getQueryClient() {
  if (isServer) {
    return createQueryClient();
  }

  if (!queryClient) {
    queryClient = createQueryClient();
  }
  return queryClient;
}
