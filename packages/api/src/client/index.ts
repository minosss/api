import { BaseApi, type HandleError } from '../api.js';
import type { Middleware } from '../compose.js';
import type {
  ApiContext,
  ExtractPathParams,
  HttpApiConfig,
  HttpApiRequest,
  HttpRequest,
  InferInput,
  InferOutput,
  Options,
  Prettify,
  Transform,
} from '../types.js';

type Handler<
  I,
  O,
  M extends string,
  U extends string,
  S extends Transform,
  T extends Transform,
  C extends object = {},
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

type HandleBuilder<M extends string, C extends Record<string, unknown>> = <
  U extends string,
>(
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

export class ApiClient<
  Req extends HttpApiRequest,
  Ctx extends ApiContext,
> extends BaseApi<Req, Ctx> {
  #action: Action<Req, Ctx>;

  declare get: HandleBuilder<'GET', HttpApiConfig<Req>>;
  declare post: HandleBuilder<'POST', HttpApiConfig<Req>>;
  declare put: HandleBuilder<'PUT', HttpApiConfig<Req>>;
  declare delete: HandleBuilder<'DELETE', HttpApiConfig<Req>>;
  declare patch: HandleBuilder<'PATCH', HttpApiConfig<Req>>;

  constructor(opts: {
    action: Action<Req, Ctx>;
    middlewares?: Middleware<Ctx, any>[];
    handleError?: HandleError<Ctx>;
  }) {
    super({
      middlewares: opts.middlewares ?? [],
      handleError: opts.handleError,
    });
    this.#action = opts.action;

    const allMethods = ['get', 'post', 'put', 'delete', 'patch'] as const;
    for (const method of allMethods) {
      this[method] = (url, initialConfig) =>
        this.createApiClientHandler({
          initialConfig: {
            ...initialConfig,
            method: method.toUpperCase(),
            url,
          } as any,
        });
    }
  }

  private async createRequest(
    initialConfig: { method: string; url: string },
    input: unknown,
    requestConfig = {},
  ): Promise<Req> {
    const { method, url, ...initial } = initialConfig;
    return {
      ...initial,
      ...requestConfig,
      input,
      parsedInput: undefined,
      method,
      url,
    } as Req;
  }

  private createApiClientHandler(handlerOpts: {
    initialConfig: HttpApiConfig<Req> & HttpRequest;
    schema?: Transform;
    transform?: Transform;
  }) {
    const handler: any = this.createHandler({
      action: this.#action,
      createRequest: this.createRequest.bind(null, handlerOpts.initialConfig),
      inputSchema: handlerOpts.schema,
      outputSchema: handlerOpts.transform,
    });
    handler.validator = (schema: Transform) =>
      this.createApiClientHandler({
        ...handlerOpts,
        schema,
      });
    handler.transform = (transform: Transform) =>
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
