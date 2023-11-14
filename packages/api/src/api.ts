import type { AnyRouteDef, AnyRoute } from './router';
import type { AnyParser, IsUnknown } from './types';
import { getParser, isPlainObject } from './types';
import { getRouteDef } from './router';
import { createProxy } from './proxy';
import { ApiError } from './error';

export interface Register {
  // api: typeof api
}

// export interface RoutesRegister {}

export type AnyHttpClient = (config: any) => Promise<any>;
export type RequestConfig = Register extends { api: { http: AnyHttpClient } }
  ? Parameters<Register['api']['http']>[0]
  : never;
export type HttpClient = Register extends { api: ApiOptions }
  ? Register['api']['http']
  : AnyHttpClient;

export interface Routes {
  readonly [key: string]: AnyRoute | Routes;
}

type RouteToRequest<R extends AnyRoute> = IsUnknown<R['_def']['_input']> extends true
  ? (input?: R['_def']['_input'], config?: RequestConfig) => Promise<R['_def']['_output']>
  : (input: R['_def']['_input'], config?: RequestConfig) => Promise<R['_def']['_output']>;

type ExtractRoutes<T> = T extends AnyRoute
  ? RouteToRequest<T>
  : T extends Routes
    ? { [K in keyof T]: ExtractRoutes<T[K]> }
    : never;

export interface ApiOptions {
  http: AnyHttpClient;
  routes: Routes;
  validator?(schema: AnyParser, input: unknown): unknown;
  guard?(config: any, route: AnyRoute): boolean;
  onSuccess?(output: any): void;
  onError?(error: any): void;
  onFinished?(config: any): void;
}

export type ApiClient<A extends ApiOptions> = ExtractRoutes<A['routes']> & {
  http: A['http'];
};

export function createApi<A extends ApiOptions>(options: A): ApiClient<A> {
  const { routes, http, validator, guard, onError, onFinished, onSuccess } = options;

  return createProxy(async (opts) => {
    // return http client
    if (opts.path[0] === 'http') {
      return http.call(http, opts.args);
    }

    const [input, config] = opts.args;
    const parts = [...opts.path];

    // route

    let route: any;
    for (const part of parts) {
      route = (route || routes)[part];
    }
    const def = getRouteDef(route);
    if (def == null) {
      throw ApiError.from('Can not found route def.', ApiError.ERR_BAD_ROUTE, route);
    }

    const { path, method, schema, transform } = def as AnyRouteDef;

    // input

    let nextInput = validator ? validator(schema, input) : getParser(schema)(input);

    // url

    let url = path;
    const pathParams = url.match(/:[\dA-Za-z]+/g);
    if (pathParams) {
      for (const pathParam of pathParams) {
        const key = pathParam.slice(1);
        if (isPlainObject(nextInput)) {
          const value = nextInput[key];
          if (typeof value === 'number' || typeof value === 'string') {
            url = url.replace(pathParam, `${value}`);
            delete nextInput[key];
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

    if (['post', 'put', 'patch'].includes(method.toLowerCase())) {
      requestConfig.data = nextInput;
    } else {
      requestConfig.params = nextInput;
    }

    // guard
    if (guard) {
      const isPass = guard(requestConfig, route);
      if (isPass !== true) {
        throw ApiError.from(`You don't have access to ${requestConfig.method} ${requestConfig.url}`, ApiError.ERR_ACCESS_DENIED, route);
      }
    }

    // http request

    try {
      const response = await http(requestConfig);
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
