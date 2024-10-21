import { ApiBase, type ApiContext, type ApiOptions } from './api-base.js';
import { compose } from './compose.js';
import type {
  AnyAsyncFn,
  Env,
  ExtractConfig,
  InferInput,
  InferOutput,
  Middleware,
  Transform,
} from './types.js';
import { validate } from './validate.js';

type ApiClientAction<E extends Env> = (
  config: ApiClientContext<E>['config'] & { input: unknown },
  c: ApiClientContext<E>,
) => Promise<any>;

export interface ApiClientOptions<E extends Env> extends ApiOptions<E> {
  action: ApiClientAction<E>;
}

export type ApiClientContext<E extends Env> = ApiContext<E> & {
  config: {
    method: string;
    url: string;
  };
  input: unknown;
  output: unknown;
  action: ApiClientAction<E>;
};

export interface ApiClientHandlerOptions {
  method: string;
  url: string;
  schema: Transform | undefined;
  transform: Transform | undefined;
  initialConfig: object;
}

interface RequestHandler<
  I,
  O,
  M extends string,
  U extends string,
  S extends Transform,
  T extends Transform,
  E extends Env,
> {
  (input: I): Promise<O>;
  (input: I, requestConfig: ExtractConfig<E>): Promise<O>;

  validator<OS extends Transform = Transform<I, unknown>>(
    schema: OS,
  ): RequestHandler<InferInput<OS>, O, M, U, OS, T, E>;

  selector<OT extends Transform = Transform<O, unknown>>(
    transform: OT,
  ): RequestHandler<I, InferOutput<OT>, M, U, S, OT, E>;

  T<OO = O>(): RequestHandler<I, OO, M, U, S, T, E>;
  T<OI = I, OO = O>(): RequestHandler<OI, OO, M, U, S, T, E>;
}

type ExtractParams<U extends string> =
  U extends `${string}:${infer P}/${infer R}`
    ? { [K in P | keyof ExtractParams<R>]: string | number }
    : U extends `${string}:${infer P}`
      ? { [K in P]: string | number }
      : // biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
        void;

type RequestBuilder<E extends Env, M extends string> = <U extends string>(
  url: U,
  initialConfig?: object,
) => RequestHandler<ExtractParams<U>, unknown, M, U, never, never, E>;

export class ApiClient<E extends Env> extends ApiBase<E> {
  #action: AnyAsyncFn;

  get!: RequestBuilder<E, 'GET'>;
  post!: RequestBuilder<E, 'POST'>;
  put!: RequestBuilder<E, 'PUT'>;
  patch!: RequestBuilder<E, 'PATCH'>;
  delete!: RequestBuilder<E, 'DELETE'>;

  constructor(opts: ApiClientOptions<E>) {
    super({
      mergeConfig: opts.mergeConfig,
      middlewares: opts.middlewares,
      onError: opts.onError,
    });
    this.#action = opts.action;

    const allMethods = ['get', 'post', 'put', 'patch', 'delete'] as const;
    for (const method of allMethods) {
      this[method] = ((url, initialConfig = {}) =>
        this.createOverrideHandler(
          {
            initialConfig,
            method: method.toUpperCase(),
            url,
            schema: undefined,
            transform: undefined,
          },
          this.createHandler,
          {
            validator: 'schema',
            selector: 'transform',
            T: '',
          },
        )) as RequestBuilder<any, any>;
    }
  }

  private createHandler(handlerOpts: ApiClientHandlerOptions) {
    return async (input: unknown, requestConfig = {}) => {
      const context = await compose(
        [
          async (c, next) => {
            const config = {
              ...requestConfig,
              method: handlerOpts.method,
              url: handlerOpts.url,
            };
            c.action = this.#action;
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
      )({ output: undefined }, async (c) => {
        const output = await c.action(
          {
            ...c.config,
            input: c.input,
          },
          c,
        );
        return handlerOpts.transform
          ? await validate(handlerOpts.transform, output)
          : output;
      });

      return context.output;
    };
  }

  use<NC extends object>(middleware: Middleware<ApiClientContext<E>, NC>) {
    return new ApiClient<E>({
      action: this.#action,
      mergeConfig: this.mergeConfig,
      onError: this.onError,
      middlewares: [...this.middlewares, middleware],
    });
  }
}
