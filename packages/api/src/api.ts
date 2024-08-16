import type { AnyRoute } from './router';
import type { AnyFn, IsUnknown } from './types';
import { isRoute } from './router';
import { ApiError } from './error';
import { getParser } from './parser';
import { createProxy } from './proxy';

async function promisify<T>(value: T | Promise<T>): Promise<T> {
  return value instanceof Promise ? value : Promise.resolve(value);
}

/**
 * Skip input if it's undefined
 *
 * @example
 * api.users.all(Nothing, { ... });
 * api.users.all(undefined, { ... });
 * api.users.all(void 0, { ... });
 */
export const Nothing: undefined = Object.freeze(undefined);

export const API_HTTP_METHOD = 'http';

export type ExtractApiPaths<T> = T extends object
  ? {
      [K in keyof T]:
        | `${T[K] extends (...args: any[]) => any ? K & string : never}`
        | `${K & string}.${ExtractApiPaths<T[K]>}`;
    }[keyof T]
  : never;

export type BaseRequestConfig =
  | {
      method: 'GET';
      url: string;
      params: any;
      data?: undefined;
    }
  | {
      method: 'POST' | 'PUT' | 'DELETE';
      url: string;
      params?: undefined;
      data: any;
    };

export type SupportedMethods = BaseRequestConfig['method'];

type RouteRequestConfig<T> = Omit<T, keyof BaseRequestConfig>;
type AnyRequestConfig = Record<string, any>;

/**
 * Return first argument of http function
 */
export type RequestConfig<Client> = Client extends { http: AnyFn }
  ? RouteRequestConfig<Parameters<Client['http']>[0]>
  : AnyRequestConfig;

export interface Routes {
  readonly [key: string]: AnyRoute | Routes;
}

type RouteToRequest<R extends AnyRoute, A extends ApiOptions> =
  IsUnknown<R['def']['_input']> extends true
    ? (input?: void, config?: RequestConfig<A>) => Promise<R['def']['_output']>
    : (input: R['def']['_input'], config?: RequestConfig<A>) => Promise<R['def']['_output']>;

type ExtractRoutes<T, A extends ApiOptions> = T extends AnyRoute
  ? RouteToRequest<T, A>
  : T extends Routes
    ? { [K in keyof T]: ExtractRoutes<T[K], A> }
    : never;

type CallbackContext = {
  route: AnyRoute;
  request: BaseRequestConfig;
  response?: unknown;
  error?: unknown;
};

export interface ApiOptions {
  /** request function */
  http: AnyFn;

  /** routes */
  routes: Routes;

  /** remove input if match path param, true by defaults */
  removePathParams?: boolean;

  guard?(config: any, route: AnyRoute): boolean | Promise<boolean>;

  onSuccess?(ctx: CallbackContext): void;
  onError?(ctx: CallbackContext): void;
  onFinished?(ctx: CallbackContext): void;
}

export type ApiClient<A extends ApiOptions> = ExtractRoutes<A['routes'], A> &
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

    if (!isRoute(route)) {
      throw ApiError.from('Can not found route.', ApiError.ERR_BAD_ROUTE, route);
    }

    const { path, method, schema, transform } = route.def;

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

    const requestConfig: BaseRequestConfig = {
      ...config,
      method,
      url,
    };

    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      requestConfig.data = nextInput;
    } else {
      requestConfig.params = nextInput;
    }

    // guard
    if (guard) {
      const isPass = await promisify(guard(requestConfig, route));

      if (isPass !== true) {
        throw ApiError.from(
          `You don't have access to ${requestConfig.method} ${requestConfig.url}`,
          ApiError.ERR_ACCESS_DENIED,
          route,
        );
      }
    }

    // http request

    const ctx: CallbackContext = {
      route,
      request: requestConfig,
    };

    try {
      // http request
      const response = await promisify(http(requestConfig));
      // parser response
      const nextResponse = getParser(transform)(response);

      ctx.response = nextResponse;
      onSuccess?.(ctx);

      return nextResponse;
    } catch (error) {
      (error as any).request = requestConfig;

      ctx.error = ApiError.from(error, ApiError.ERR_HTTP_ERROR, route);
      onError?.(ctx);

      throw ctx.error;
    } finally {
      onFinished?.(ctx);
    }
  }, []) as any;
}
