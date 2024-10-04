import { compose } from './compose.js';
import { ApiError } from './error.js';
import type {
  InferInput,
  InferOutput,
  MiddlewareFn,
  Transform,
  ActionConfig,
  Context,
  Action,
  AnyPromiseFn,
} from './types.js';
import { validate } from './validate.js';


export interface Handler<
  I,
  O,
  M extends string,
  U extends string,
  S extends Transform,
  T extends Transform,
  A extends AnyPromiseFn,
> {
  (input: I): Promise<O>;
  (
    input: I,
    actionConfig: Omit<Parameters<A>[0], keyof ActionConfig>,
  ): Promise<O>;

  validator<OS extends Transform = Transform<I, unknown>>(
    schema: OS,
  ): Handler<InferInput<OS>, O, M, U, OS, T, A>;
  selector<OT extends Transform = Transform<O, unknown>>(
    transform: OT,
  ): Handler<I, InferOutput<OT>, M, U, S, OT, A>;
  T<OO = O>(): Handler<I, OO, M, U, S, T, A>;
  T<OI = I, OO = O>(): Handler<OI, OO, M, U, S, T, A>;
}

export function createHandler<
  I,
  O,
  M extends string,
  U extends string,
  S extends Transform,
  T extends Transform,
  A extends AnyPromiseFn,
>(opts: {
  method: M;
  url: U;
  schema?: S;
  transform?: T;
  action?: A;
  middlewares?: MiddlewareFn<any>[];
  onError?: (error: Error) => Promise<any>;
}): Handler<I, O, M, U, S, T, A> {
  async function handler(input: I, actionConfig = {}) {
    // input
    let data = input;
    try {
      if (opts.schema != null) {
        data = await validate(opts.schema, data);
      }
    } catch (error) {
      throw ApiError.from(error, ApiError.ERR_BAD_INPUT);
    }

    const config = {
      ...actionConfig,
      method: opts.method,
      url: opts.url,
      data,
    };

    const c: Context = {
      config,
      dispatch: async () => opts.action?.(config, c),
      data: undefined,
      finalized: false,
    };

    let output: any;
    try {
      const ctx = await compose<Context>(
        [...(opts.middlewares ?? []), async (c) => c.dispatch()],
        opts.onError,
      )(c);
      output = ctx.data;
    } catch (error) {
      throw ApiError.from(error, ApiError.ERR_BAD_HTTP);
    }

    try {
      if (opts.transform) {
        output = await validate(opts.transform, output);
      }
    } catch (error) {
      throw ApiError.from(error, ApiError.ERR_BAD_OUTPUT);
    }

    return output;
  }

  handler.validator = (schema: any) =>
    createHandler({
      ...opts,
      schema,
    });
  handler.selector = (transform: any) =>
    createHandler({
      ...opts,
      transform,
    });
  handler.T = () =>
    createHandler({
      ...opts,
    });

  return handler as any;
}

export interface Api<C extends Context> {
  use: (middleware: MiddlewareFn<C>) => Api<C>;
  get: <U extends string>(
    url: U,
  ) => Handler<void, unknown, 'GET', U, never, never, Action<C>>;
  post: <U extends string>(
    url: U,
  ) => Handler<void, unknown, 'POST', U, never, never, Action<C>>;
  put: <U extends string>(
    url: U,
  ) => Handler<void, unknown, 'PUT', U, never, never, Action<C>>;
  patch: <U extends string>(
    url: U,
  ) => Handler<void, unknown, 'PATCH', U, never, never, Action<C>>;
  delete: <U extends string>(
    url: U,
  ) => Handler<void, unknown, 'DELETE', U, never, never, Action<C>>;
}

export function createApi<C extends Context>(
  action: Action<C>,
  opts: {
    middlewares?: MiddlewareFn<C>[];
    onError?: (error: Error) => Promise<any>;
  } = {},
): Api<C> {
  const api: any = {
    use: (middleware: MiddlewareFn<C>) => {
      return createApi(action, {
        ...opts,
        middlewares: [...(opts.middlewares ?? []), middleware],
      });
    },
  };
  const allMethods = ['get', 'post', 'put', 'patch', 'delete'] as const;
  for (const method of allMethods) {
    api[method] = (url: string) => {
      return createHandler({
        method: method.toUpperCase(),
        url,
        action,
        middlewares: opts.middlewares,
        onError: opts.onError,
      });
    };
  }

  return api;
}
