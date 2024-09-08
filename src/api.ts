import type {} from "zod";
import type {
  AnyRequestDef,
  Request,
  HttpRequest,
  RequestDef,
  MiddlewareFn,
  RequestConfig,
} from "./types.js";
import { ApiError } from "./error.js";
import { validate } from "./validate.js";

export class Api<H extends HttpRequest> {
  readonly #http: H;
  readonly #middlewares: MiddlewareFn[];

  constructor(options: {
    http: H;
    middlewares?: MiddlewareFn[];
  }) {
    this.#http = options.http;
    this.#middlewares = options.middlewares || [];
  }

  use(middleware: MiddlewareFn) {
    return new Api({
      middlewares: [...this.#middlewares, middleware],
      http: this.#http,
    });
  }

  get<P extends string>(url: P, requestConfig?: RequestConfig<H>) {
    return buildRequest<
      RequestDef<void, any, "GET", P, undefined, undefined, H>
    >({
      ...requestConfig,
      http: this.#http,
      middlewares: this.#middlewares,
      method: "GET",
      url,
    });
  }

  post<P extends string>(url: P, requestConfig?: RequestConfig<H>) {
    return buildRequest<
      RequestDef<void, any, "POST", P, undefined, undefined, H>
    >({
      ...requestConfig,
      http: this.#http,
      middlewares: this.#middlewares,
      method: "POST",
      url,
    });
  }

  put<P extends string>(url: P, requestConfig?: RequestConfig<H>) {
    return buildRequest<
      RequestDef<void, any, "PUT", P, undefined, undefined, H>
    >({
      ...requestConfig,
      http: this.#http,
      middlewares: this.#middlewares,
      method: "PUT",
      url,
    });
  }

  delete<P extends string>(url: P, requestConfig?: RequestConfig<H>) {
    return buildRequest<
      RequestDef<void, any, "DELETE", P, undefined, undefined, H>
    >({
      ...requestConfig,
      http: this.#http,
      middlewares: this.#middlewares,
      method: "DELETE",
      url,
    });
  }

  patch<P extends string>(url: P, requestConfig?: RequestConfig<H>) {
    return buildRequest<
      RequestDef<void, any, "PATCH", P, undefined, undefined, H>
    >({
      ...requestConfig,
      http: this.#http,
      middlewares: this.#middlewares,
      method: "PATCH",
      url,
    });
  }
}

function buildRequest<Def extends AnyRequestDef>(options: {
  method: Def["method"];
  url: Def["url"];
  schema?: Def["schema"];
  transform?: Def["transform"];
  http: Def["http"];
  middlewares: MiddlewareFn[];
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
    const ctx = { config, parsedInput: input, output: undefined };

    try {
      const middlewares: MiddlewareFn[] = [
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
