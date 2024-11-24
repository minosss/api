import { type ApiOptions, BaseApi } from '../api.js';
import type { Middleware } from '../compose.js';
import type {
  ApiContext,
  ExtractPathParams,
  ExtractRequestConfig,
  InferInput,
  InferOutput,
  Options,
  Prettify,
  Transform,
  ApiRequest,
  SomeObject,
} from '../types.js';

type InitialConfig = {
  method: string;
  url: string;
};

type Handler<
  I,
  O,
  M extends string,
  U extends string,
  S extends Transform,
  T extends Transform,
  C extends SomeObject = {},
> = {
  (input: I): Promise<O>;
  (input: I, requestConfig: C): Promise<O>;

  validator<OS extends Transform = Transform<I, unknown>>(
    schema: OS,
  ): Handler<InferInput<OS>, O, M, U, OS, T, C>;

  selector<OT extends Transform = Transform<O, unknown>>(
    transform: OT,
  ): Handler<I, InferOutput<OT>, M, U, S, OT, C>;

  T<OO = O>(): Handler<I, OO, M, U, S, T, C>;
  T<OI = I, OO = O>(): Handler<OI, OO, M, U, S, T, C>;
};

type HandleBuilder<M extends string, C extends SomeObject> = <U extends string>(
  url: U,
  initialConfig?: C,
) => Handler<ExtractPathParams<U>, unknown, M, U, never, never, C>;

type Action<Req, Ctx> = (
  opts: Prettify<
    Options & {
      req: Req;
      ctx: Ctx;
    }
  >,
) => Promise<any>;

export type ApiClientOptions<
  Req extends ApiRequest,
  Ctx extends ApiContext,
> = ApiOptions<Ctx> & {
  action: Action<Req, Ctx>;
};

export class ApiClient<
  Req extends ApiRequest,
  Ctx extends ApiContext,
> extends BaseApi<Req, Ctx> {
  #action: Action<Req, Ctx>;

  declare get: HandleBuilder<'GET', ExtractRequestConfig<Req>>;
  declare post: HandleBuilder<'POST', ExtractRequestConfig<Req>>;
  declare put: HandleBuilder<'PUT', ExtractRequestConfig<Req>>;
  declare delete: HandleBuilder<'DELETE', ExtractRequestConfig<Req>>;
  declare patch: HandleBuilder<'PATCH', ExtractRequestConfig<Req>>;
  declare head: HandleBuilder<'HEAD', ExtractRequestConfig<Req>>;
  declare options: HandleBuilder<'OPTIONS', ExtractRequestConfig<Req>>;

  constructor(opts: ApiClientOptions<Req, Ctx>) {
    super({
      middlewares: opts.middlewares,
      handleError: opts.handleError,
    });
    this.#action = opts.action;

    const allMethods = [
      'get',
      'post',
      'put',
      'delete',
      'patch',
      'head',
      'options',
    ];
    for (const method of allMethods) {
      this[method] = (url: string, initialConfig = {}) =>
        this.createApiClientHandler({
          initialConfig: {
            ...initialConfig,
            method: method.toUpperCase(),
            url,
          },
        });
    }
  }

  protected createRequest(initialConfig: InitialConfig) {
    return async (input: unknown, requestConfig = {}) => {
      const { method, url, ...initial } = initialConfig;
      return {
        ...initial,
        ...requestConfig,
        input,
        parsedInput: undefined,
        method,
        url,
      } as Req;
    };
  }

  private createApiClientHandler(handlerOpts: {
    initialConfig: InitialConfig;
    schema?: Transform;
    transform?: Transform;
  }) {
    const handler: any = this.createHandler({
      action: this.#action,
      createRequest: this.createRequest(handlerOpts.initialConfig),
      inputSchema: handlerOpts.schema,
      outputSchema: handlerOpts.transform,
    });
    handler.validator = (schema: Transform) =>
      this.createApiClientHandler({
        ...handlerOpts,
        schema,
      });
    handler.selector = (transform: Transform) =>
      this.createApiClientHandler({
        ...handlerOpts,
        transform,
      });
    handler.T = () =>
      this.createApiClientHandler({
        ...handlerOpts,
      });

    return handler;
  }

  use<NC extends object>(middleware: Middleware<Ctx, NC>) {
    return new ApiClient<Req, Ctx & NC>({
      action: this.#action,
      middlewares: [...this.middlewares, middleware],
    });
  }
}
