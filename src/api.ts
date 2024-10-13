import type {
  ExtractConfig,
  Middleware,
  InferInput,
  InferOutput,
  Transform,
  Env,
  AnyAsyncFn,
} from './types.js';
import { compose } from './compose.js';
import { validate } from './validate.js';

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
  initialConfig?: ExtractConfig<E>,
) => RequestHandler<ExtractParams<U>, unknown, M, U, never, never, E>;

export type ApiClientContext<E extends Env = Env> = {
  // requestConfig
  config: {
    method: string;
    url: string;
  };
  input: unknown;
  output: unknown;
  action: AnyAsyncFn;
} & E['Context'];

export class ApiClient<E extends Env = {}> {
  #middlewares: Middleware<any, any>[];
  #action: AnyAsyncFn;
  #mergeConfig: (target: object, source: object) => object;
  #onError?: (c: ApiClientContext<E>) => Promise<any>;

  get!: RequestBuilder<E, 'GET'>;
  post!: RequestBuilder<E, 'POST'>;
  put!: RequestBuilder<E, 'PUT'>;
  patch!: RequestBuilder<E, 'PATCH'>;
  delete!: RequestBuilder<E, 'DELETE'>;

  constructor(opts: {
    /**
     * action to execute
     */
    action: (
      config: ApiClientContext<E>['config'] & { input: unknown },
      c: ApiClientContext<E>,
    ) => Promise<any>;

    /**
     */
    middlewares?: Middleware<any, any>[];

    /**
     * merge config (initialConfig, requestConfig), default to `Object.assign`
     */
    mergeConfig?: (target: object, source: object) => object;

    /**
     * handle error
     * @param c context
     * @returns output of action
     */
    onError?: (c: ApiClientContext<E>) => Promise<any>;
  }) {
    this.#action = opts.action;
    this.#middlewares = opts?.middlewares ?? [];
    this.#mergeConfig = opts.mergeConfig ?? Object.assign;
    this.#onError = opts.onError;

    const allMethods = ['get', 'post', 'put', 'patch', 'delete'] as const;
    for (const method of allMethods) {
      this[method] = (url, initialConfig) =>
        this.createHandler({
          initialConfig,
          method: method.toUpperCase(),
          url,
          schema: undefined,
          transform: undefined,
        });
    }
  }

  private createHandler(opts: {
    method: string;
    url: string;
    initialConfig: object | undefined;
    schema: Transform | undefined;
    transform?: Transform | undefined;
  }) {
    const handler: RequestHandler<any, any, any, any, any, any, E> = async (
      input,
      requestConfig = {},
    ) => {
      const context = await compose(
        [
          // setup request context
          async (c, next) => {
            const config = {
              ...requestConfig,
              method: opts.method,
              url: opts.url,
            };
            c.action = this.#action;
            c.config = opts.initialConfig
              ? this.#mergeConfig(opts.initialConfig, config)
              : config;
            c.input = opts.schema ? await validate(opts.schema, input) : input;
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
          return opts.transform
            ? await validate(opts.transform, output)
            : output;
        },
      );

      return context.output;
    };

    handler.validator = (schema) => this.createHandler({ ...opts, schema });
    handler.selector = (transform) =>
      this.createHandler({ ...opts, transform });
    handler.T = () => this.createHandler({ ...opts });

    return handler;
  }

  use<NC extends object>(middleware: Middleware<ApiClientContext<E>, NC>) {
    return new ApiClient<E>({
      action: this.#action,
      mergeConfig: this.#mergeConfig,
      onError: this.#onError,
      middlewares: [...this.#middlewares, middleware],
    });
  }
}
