import type { NextRequest } from 'next/server.js';
import type {
  AnyAsyncFn,
  Env,
  ExtractConfig,
  InferInput,
  InferOutput,
  Middleware,
  Prettify,
  Transform,
} from './types.js';
import { ApiBase, type ApiOptions, type ApiContext } from './api-base.js';
import { compose } from './compose.js';
import { validate } from './validate.js';

export interface ApiRequestHandlerOptions {
  method: string;
  url: string;
  initialConfig: object;
  schema: Transform | undefined;
  routeParamsSchema: Transform | undefined;
  action: AnyAsyncFn;
}

export type ApiRequestContext<E extends Env> = ApiContext<E> & {
  rawRequest: NextRequest;
  config: {
    method: string;
    url: string;
    routeParams: unknown;
  };
  input: unknown;
  output: unknown;
  status?: number;
  action: AnyAsyncFn;
};

export type ApiRequestOptions<E extends Env> = ApiOptions<E> & {};

interface RequestHandler<
  I,
  O,
  M extends string,
  U extends string,
  S extends Transform,
  R extends Transform,
  E extends Env,
> {
  // todo extract route params from url
  (req: NextRequest, route?: { params: InferOutput<R> }): Promise<Response>;

  validator<OS extends Transform>(
    schema: OS,
  ): RequestHandler<InferInput<OS>, O, M, U, OS, R, E>;

  routeParams<OR extends Transform>(
    schema: OR,
  ): RequestHandler<I, O, M, U, S, OR, E>;

  action<OO = O>(
    action: (
      config: Prettify<
        ApiRequestContext<E>['config'] & {
          input: I;
          routeParams: InferOutput<R>;
        }
      >,
      ctx: ApiRequestContext<E>,
    ) => Promise<OO>,
  ): RequestHandler<I, OO, M, U, S, R, E>;
}

interface RequestBuilder<E extends Env, M extends string> {
  <U extends string>(
    url: U,
    initialConfig?: ExtractConfig<E>,
  ): RequestHandler<unknown, unknown, M, U, never, never, E>;
  (
    initialConfig?: ExtractConfig<E>,
  ): RequestHandler<unknown, unknown, M, string, never, never, E>;
}

export const noop = async () => null;

/**
 * define a nextjs request handler
 *
 * @example
 *
 * const ar = new ApiRequest({});
 *
 * export const POST = ar.post()
 *   .validator(z.object({ name: z.string() }))
 *   .action(async (config, ctx) => {
 *     // config.input.name
 *   })
 *
 * // app/api/users/[userId]/route.ts
 * export const POST = ar.post()
 *   .validator(z.object({ name: z.string() }))
 *   .routeParams(z.object({ userId: z.string() }))
 *   .action(async (config, ctx) => {
 *     // config.input.name
 *     // config.routeParams.userId
 *   });
 */
export class ApiRequest<E extends Env> extends ApiBase<E> {
  get!: RequestBuilder<E, 'GET'>;
  post!: RequestBuilder<E, 'POST'>;
  put!: RequestBuilder<E, 'PUT'>;
  patch!: RequestBuilder<E, 'PATCH'>;
  delete!: RequestBuilder<E, 'DELETE'>;

  constructor(opts: ApiRequestOptions<E>) {
    super({
      mergeConfig: opts.mergeConfig,
      middlewares: opts.middlewares,
      onError: opts.onError,
    });

    const allMethods = ['get', 'post', 'put', 'patch', 'delete'] as const;
    for (const method of allMethods) {
      this[method] = ((...args: any[]) =>
        this.createOverrideHandler(
          {
            method: method.toUpperCase(),
            url: typeof args[0] === 'string' ? args[0] : '/',
            initialConfig: typeof args[0] === 'string' ? args[1] : args[0],
            schema: undefined,
            routeParamsSchema: undefined,
            action: noop,
          },
          this.createHandler.bind(this),
          {
            validator: 'schema',
            routeParams: 'routeParamsSchema',
            action: 'action',
          },
        )) as RequestBuilder<any, any>;
    }
  }

  use<NC extends object>(middleware: Middleware<ApiRequestContext<E>, NC>) {
    return new ApiRequest<E>({
      mergeConfig: this.mergeConfig,
      middlewares: [...this.middlewares, middleware],
      onError: this.onError,
    });
  }

  private createHandler(handlerOpts: ApiRequestHandlerOptions) {
    return async (
      req: NextRequest,
      route: { params: object } = { params: {} },
    ) => {
      let input: any;
      if (
        // ? req.headers['content-type'] is not available in NextRequest
        (req.headers instanceof Headers &&
          req.headers.get('content-length') !== '0' &&
          req.headers.get('content-type') === 'application/json') ||
        (req.headers['content-length'] !== '0' &&
          req.headers['content-type'] === 'application/json')
      ) {
        input = await req.json();
      }

      const context = (await compose(
        [
          // setup request context
          async (c, next) => {
            const config = {
              // todo: validate method and url?
              method: req.method,
              url: req.url,
              routeParams: handlerOpts.routeParamsSchema
                ? await validate(handlerOpts.routeParamsSchema, route.params)
                : route.params,
            };
            c.rawRequest = req;
            c.action = handlerOpts.action;
            c.config = handlerOpts.initialConfig
              ? this.mergeConfig(handlerOpts.initialConfig, config)
              : config;
            c.input = handlerOpts.schema
              ? await validate(handlerOpts.schema, input)
              : input;
            c.output = undefined;
            await next();
          },
          ...this.middlewares,
        ],
        this.onError,
      )(
        {
          output: undefined,
        },
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
      )) as ApiRequestContext<E>;

      if (context.output instanceof Response) {
        return context.output;
      }

      return Response.json(context.output, {
        status: context.status ?? 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    };
  }
}
