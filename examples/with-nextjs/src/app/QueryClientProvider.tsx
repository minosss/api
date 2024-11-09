'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '../lib/queryClient';

export default function ReactQueryClientProvider({
  children,
}: { children: React.ReactNode }) {
  const client = getQueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
