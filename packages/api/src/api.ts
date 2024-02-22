import type { AnyRoute, AnyRouteDef } from './router';
import type { ErrorMessage, AnyFn, IsUnknown } from './types';
import { getParser } from './parser';
import { createProxy } from './proxy';
import { ApiError } from './error';

export interface Register {
  // api: typeof api
}

// export interface RoutesRegister {}

export const API_HTTP_METHOD = 'http';

type UnRegister = ErrorMessage<'Waiting register api client'>;

export type ExtractApiPaths<T> = T extends object
  ? {
      [K in keyof T]:
        | `${T[K] extends (...args: any[]) => any ? K & string : never}`
        | `${K & string}.${ExtractApiPaths<T[K]>}`;
    }[keyof T]
  : never;

export type CurrentApiPaths = ExtractApiPaths<
  Register extends { api: infer A } ? A : Record<UnRegister, never>
>;

export type BaseRequestConfig =
  | {
      method: string;
      url: string;
      params: any;
      data?: undefined;
    }
  | {
      method: string;
      url: string;
      params?: undefined;
      data: any;
    };

export type RequestConfig = Register extends { api: ApiClient<infer A> }
  ? Omit<Parameters<A['http']>[0], keyof BaseRequestConfig>
  : UnRegister;

export interface Routes {
  readonly [key: string]: AnyRoute | Routes;
}

type RouteToRequest<R extends AnyRoute> =
  IsUnknown<R['def']['_input']> extends true
    ? (input?: any, config?: RequestConfig) => Promise<R['def']['_output']>
    : (input: R['def']['_input'], config?: RequestConfig) => Promise<R['def']['_output']>;

type ExtractRoutes<T> = T extends AnyRoute
  ? RouteToRequest<T>
  : T extends Routes
    ? { [K in keyof T]: ExtractRoutes<T[K]> }
    : never;

export interface ApiOptions {
  /** request function */
  http: AnyFn;

  /** routes */
  routes: Routes;

  /** remove input if match path param, true by defaults */
  removePathParams?: boolean;

  guard?(config: any, route: AnyRoute): boolean | Promise<boolean>;
  onSuccess?(output: any): void;
  onError?(error: any): void;
  onFinished?(config: any): void;
}

export type ApiClient<A extends ApiOptions> = ExtractRoutes<A['routes']> &
  Record<typeof API_HTTP_METHOD, A['http']>;

const cached = <T extends (...args: any[]) => any>(getValue: T) => {
  const cache = new Map<any, any>();
  return ((key: any) => {
    const _key = key.toString();
    if (cache.has(_key)) {
      return cache.get(_key);
    }
    const value = getValue(key);
    cache.set(_key, value);
    return value;
  }) as T;
};

export function createApi<A extends ApiOptions>(options: A): ApiClient<A> {
  const {
    routes,
    http,
    guard,
    onError,
    onFinished,
    onSuccess,
    removePathParams = true,
  } = options;

  const getCachedParams = cached((key: string) => key.match(/:\w+/g));
  const getCachedRoute = cached((keys: string[]) => {
    let route: any;
    for (const key of keys) {
      route = (route || routes)[key];
    }
    return route;
  });

  return createProxy(async (opts) => {
    // return http client
    if (opts.path[0] === API_HTTP_METHOD) {
      return http.call(http, opts.args);
    }

    const [input, config] = opts.args;
    const route = getCachedRoute(opts.path);

    const def = route?.def;
    if (def == null) {
      throw ApiError.from('Can not found route def.', ApiError.ERR_BAD_ROUTE, route);
    }

    const { path, method, schema, transform } = def as AnyRouteDef;

    // path params
    const pathParams = getCachedParams(path);

    // input

    let nextInput = getParser(schema)(input);

    // url

    let url = path;

    if (pathParams) {
      for (const pathParam of pathParams) {
        const key = pathParam.slice(1);
        if (nextInput !== null && typeof nextInput === 'object' && !Array.isArray(nextInput)) {
          const value = nextInput[key];
          if (typeof value === 'number' || typeof value === 'string') {
            url = url.replace(pathParam, `${value}`);
            if (removePathParams) delete nextInput[key];
          } else {
            throw ApiError.from(`Bad params ${key} data.`, ApiError.ERR_BAD_INPUT, route);
          }
        } else if (typeof nextInput === 'number' || typeof nextInput === 'string') {
          url = url.replace(pathParam, `${nextInput}`);
          nextInput = undefined;
          break;
        } else {
          throw ApiError.from(`Bad params ${key} data.`, ApiError.ERR_BAD_INPUT, route);
        }
      }
    }

    // request config

    const requestConfig: any = {
      ...config,
      method,
      url,
    };

    if (['post', 'put', 'patch'].includes(method)) {
      requestConfig.data = nextInput;
    } else {
      requestConfig.params = nextInput;
    }

    // guard
    if (guard) {
      let isPass = guard(requestConfig, route);
      if (typeof isPass === 'object' && typeof isPass.then === 'function') {
        // wait for promise
        isPass = await isPass;
      }
      if (isPass !== true) {
        throw ApiError.from(
          `You don't have access to ${requestConfig.method} ${requestConfig.url}`,
          ApiError.ERR_ACCESS_DENIED,
          route,
        );
      }
    }

    // http request

    try {
      let response = http(requestConfig);
      if (typeof response === 'object' && typeof response.then === 'function') {
        response = await response;
      }
      const nextResponse = getParser(transform)(response);
      onSuccess?.(nextResponse);
      return nextResponse;
    } catch (error) {
      (error as any).request = requestConfig;
      onError?.(error);
      throw ApiError.from(error, ApiError.ERR_HTTP_ERROR);
    } finally {
      onFinished?.(requestConfig);
    }
  }, []) as any;
}
