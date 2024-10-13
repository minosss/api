import type { NextRequest } from 'next/server.js';
import { NextResponse } from 'next/server.js';
import type {
  AnyAsyncFn,
  Env,
  ExtractConfig,
  InferInput,
  Middleware,
  Transform,
} from './types.js';
import { compose } from './compose.js';

export type RouteParams = Record<string, string | readonly string[]>;

export type ApiRequestContext<E extends Env = Env> = {
  rawRequest: NextRequest;
  config: {
    routeParams: RouteParams;
  };
  input: unknown;
  output: unknown;
  status?: number;
  action: AnyAsyncFn;
} & E['Context'];

interface RequestHandler<
  I,
  O,
  M extends string,
  U extends string,
  S extends Transform,
  E extends Env,
> {
  // todo extract route params from url
  (req: NextRequest, route: { params: RouteParams }): Promise<NextResponse>;

  validator<OS extends Transform>(
    schema: OS,
  ): RequestHandler<InferInput<OS>, O, M, U, OS, E>;

  action<OO = O>(
    action: (input: I, ctx: ApiRequestContext<E>) => Promise<OO>,
  ): RequestHandler<I, OO, M, U, S, E>;
}

interface RequestBuilder<E extends Env, M extends string> {
  <U extends string>(
    url: U,
    initialConfig?: ExtractConfig<E>,
  ): RequestHandler<Request, unknown, M, U, never, E>;
  (
    initialConfig?: ExtractConfig<E>,
  ): RequestHandler<Request, unknown, M, string, never, E>;
}

export class ApiRequest<E extends Env = {}> {
  #middlewares: Middleware<any, any>[];
  #mergeConfig: (target: object, source: object) => object;
  #onError?: (c: ApiRequestContext<E>) => Promise<any>;

  get!: RequestBuilder<E, 'GET'>;
  post!: RequestBuilder<E, 'POST'>;
  put!: RequestBuilder<E, 'PUT'>;
  patch!: RequestBuilder<E, 'PATCH'>;
  delete!: RequestBuilder<E, 'DELETE'>;

  constructor(opts: {
    middlewares?: Middleware<any, any>[];
    mergeConfig?: (target: object, source: object) => object;
    onError?: (c: ApiRequestContext<E>) => Promise<any>;
  }) {
    this.#middlewares = opts.middlewares ?? [];
    this.#mergeConfig = opts.mergeConfig ?? Object.assign;
    this.#onError = opts.onError;

    const allMethods = ['get', 'post', 'put', 'patch', 'delete'] as const;
    for (const method of allMethods) {
      this[method] = (
        // url, config
        // config
        ...args: any[]
      ) =>
        this.createHandler({
          action: async () => null,
          method: method.toUpperCase(),
          url: typeof args[0] === 'string' ? args[0] : '/',
          schema: undefined,
          initialConfig:
            (typeof args[0] === 'string' ? args[1] : args[0]) ?? {},
        });
    }
  }

  private createHandler(opts: {
    method: string;
    url: string;
    initialConfig: object | undefined;
    schema: Transform | undefined;
    action: AnyAsyncFn;
  }) {
    const handler: RequestHandler<any, any, any, any, any, E> = async (
      req,
      route,
    ) => {
      const routeParams = route.params;

      let input: any;
      if (req.headers.get('content-type') === 'application/json') {
        if (req.headers.get('content-length') !== '0') {
          input = await req.json();
        }
      }

      const context = await compose(
        [
          // setup request context
          async (c, next) => {
            const config = {
              method: req.method,
              url: req.url,
              routeParams,
            };
            c.rawRequest = req;
            c.action = opts.action;
            c.config = opts.initialConfig
              ? this.#mergeConfig(opts.initialConfig, config)
              : config;
            c.input = input;
            c.output = undefined;
            await next();
          },
          ...this.#middlewares,
        ],
        this.#onError,
      )(
        {
          output: undefined,
        } as any,
        async (c) => {
          const output = await c.action(
            {
              ...c.config,
              input: c.input,
            },
            c,
          );
          return output;
        },
      );

      if (context.output instanceof NextResponse) {
        return context.output;
      }

      return NextResponse.json(context.output, {
        status: context.status ?? 200,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    };

    handler.validator = (schema) => this.createHandler({ ...opts, schema });
    handler.action = (action) => this.createHandler({ ...opts, action });

    return handler;
  }
}
