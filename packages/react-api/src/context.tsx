import type { CurrentApiPaths, Register, ErrorMessage } from '@yme/api';
import { createContext, useContext } from 'react';

type CurrentApiClient = Register extends { api: infer T } ? T : ErrorMessage<'Waiting register api client'>;

export interface ApiContext {
  api: CurrentApiClient;
}

const Context = createContext<ApiContext | null>(null);

export interface ApiProviderProps {
  api: CurrentApiClient;
  children: React.ReactNode;
}

export const ApiProvider: React.FC<ApiProviderProps> = (props) => {
  return (
    <Context.Provider value={{ api: props.api }}>
      {props.children}
    </Context.Provider>
  );
};

type InvalidApiKey = ErrorMessage<'Invalid api key'>;

type ExtractApiFn<Key extends string, Api = CurrentApiClient> = Key extends `${infer Curr}.${infer Rest}`
  ? ExtractApiFn<Rest, Curr extends keyof Api ? Api[Curr] : InvalidApiKey>
  : Key extends keyof Api ? Api[Key] : InvalidApiKey;

/**
 * api function by route
 *
 * @param path route of api
 */
export function useApi<T extends CurrentApiPaths>(path: T): ExtractApiFn<T> | undefined;
/**
 * return api client
 */
export function useApi(path?: undefined): CurrentApiClient | undefined;
export function useApi(path: any) {
  const api = useContext(Context)?.api;
  if (typeof path === 'string' && api) {
    const paths = path.split('.');
    let result: any = api;
    for (const k of paths) {
      if (result) {
        result = result[k as keyof typeof result];
      }
    }
    return result;
  }
  return api;
}
