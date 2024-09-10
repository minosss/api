import { ApiError } from './error.js';
import type { AnyHttpRequest, AnyRequestDef, MiddlewareFn, Request, RequestConfig, RequestDef } from "./types.js";
import { validate } from './validate.js';

const methods = ['get', 'post', 'put', 'delete', 'patch'] as const;

export interface Api<H extends AnyHttpRequest> {
  http: H;
  use(middleware: MiddlewareFn<H>): Api<H>;
  get<P extends string>(url: P, requestConfig?: RequestConfig<H>): Request<RequestDef<void, any, "GET", P, undefined, undefined, H>>;
  post<P extends string>(url: P, requestConfig?: RequestConfig<H>): Request<RequestDef<void, any, "POST", P, undefined, undefined, H>>;
  put<P extends string>(url: P, requestConfig?: RequestConfig<H>): Request<RequestDef<void, any, "PUT", P, undefined, undefined, H>>;
  delete<P extends string>(url: P, requestConfig?: RequestConfig<H>): Request<RequestDef<void, any, "DELETE", P, undefined, undefined, H>>;
  patch<P extends string>(url: P, requestConfig?: RequestConfig<H>): Request<RequestDef<void, any, "PATCH", P, undefined, undefined, H>>;
}

export function createApi<H extends AnyHttpRequest>(options: {
  http: H;
  middlewares?: MiddlewareFn<H>[];
}): Api<H> {
  const { http, middlewares = [] } = options;

  const api: any = {
    http,
    use: (middleware: MiddlewareFn<H>) => {
      return createApi({
        http,
        middlewares: [...middlewares, middleware],
      });
    },
  };

  for (const method of methods) {
    api[method] = (url: string, requestConfig?: Record<string, any>) => {
      return buildRequest({
        ...requestConfig,
        http,
        middlewares,
        method: method.toUpperCase(), // get -> GET
        url,
      });
    };
  }

  return api;
}


function buildRequest<Def extends AnyRequestDef>(options: {
  method: Def["method"];
  url: Def["url"];
  schema?: Def["schema"];
  transform?: Def["transform"];
  http: Def["http"];
  middlewares: MiddlewareFn<Def['http']>[];
}): Request<Def> {
  async function request(data: any, requestConfig: any = {}) {
    const method = options.method;
    const dataKey = method === "GET" ? "params" : "data";

    let input = data;
    const url = options.url;

    try {
      if (typeof options.schema !== "undefined") {
        input = await validate(options.schema, input);
      }
    } catch (error) {
      throw ApiError.from(error, ApiError.ERR_BAD_INPUT);
    }

    const config = {
      ...requestConfig,
      [dataKey]: input,
      method,
      url,
    };

    // TODO better middlewares
    const ctx = { http: options.http, config, parsedInput: input, output: undefined };

    try {
      const middlewares: MiddlewareFn<Def['http']>[] = [
        ...options.middlewares,
        async (ctx, next) => {
          const output = await options.http(config);
          ctx.output = output;
          return next();
        },
      ];
      const executeMiddleware = async (i = 0) => {
        const fn = middlewares[i];
        if (fn) {
          await fn(ctx, () => executeMiddleware(i + 1));
        }
      };

      await executeMiddleware();
    } catch (error) {
      throw ApiError.from(error, ApiError.ERR_BAD_HTTP);
    }

    try {
      if (typeof options.transform === "function") {
        ctx.output = await validate(options.transform, ctx.output);
      }
    } catch (error) {
      throw ApiError.from(error, ApiError.ERR_BAD_OUTPUT);
    }

    return ctx.output;
  }

  // override config
  request.validator = (schema: any) =>
    buildRequest({
      ...options,
      schema,
    });
  request.selector = (transform: any) =>
    buildRequest({
      ...options,
      transform,
    });
  request.T = () =>
    buildRequest({
      ...options,
    });

  return request as any;
}
