import type { Paths, Get } from 'type-fest';
import type { ApiClient, ApiOptions } from '@yme/api';
import { createContext, useContext } from 'react';

export interface ApiContext<A extends ApiOptions> {
  api: ApiClient<A>;
}

export function createApiProvider<A extends ApiOptions>(api: ApiClient<A>) {
  const Context = createContext<ApiContext<A> | null>(null);

  function ApiProvider(props: React.PropsWithChildren) {
    return <Context.Provider value={{ api }}>{props.children}</Context.Provider>;
  }

  function useApiClient(): ApiClient<A> {
    const ctx = useContext(Context);
    if (ctx == null) throw new Error('useApiClient must be used within a ApiProvider');
    return ctx.api;
  }

  type ExtractApiFn<Key extends string> = Get<ApiClient<A>, Key>;

  type CurrentApiPaths = Paths<ApiClient<A>>;

  function useApi<T extends CurrentApiPaths>(path: T): ExtractApiFn<T> {
    const client = useApiClient();

    const paths = path.split('.');
    let fn: any = client;
    for (const k of paths) {
      if (fn) {
        fn = fn[k as keyof typeof fn];
      }
    }
    return fn;
  }

  return {
    ApiProvider,
    useApiClient,
    useApi,
  };
}
