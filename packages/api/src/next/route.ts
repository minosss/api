import type { NextRequest, NextResponse } from 'next/server.js';
import { BaseApi, type HandleError } from '../api.js';
import type {
  AnyAsyncFn,
  ApiContext,
  HttpApiConfig,
  HttpApiRequest,
  HttpRequest,
  InferInput,
  InferOutput,
  Transform,
} from '../types.js';
import type { Middleware } from '../compose.js';
import { noop } from './noop.js';

// extract the path params from the urlq
type PathParams<_U extends string> = Record<string, string | string[]>;

type Handler<
  I,
  O,
  M extends string,
  U extends string,
  S extends Transform,
  T extends Transform,
  C extends Record<string, unknown> = {},
> = {
  (req: NextRequest): Promise<NextResponse<O>>;
  (
    req: NextRequest,
    route: { params: PathParams<U> },
  ): Promise<NextResponse<O>>;

  validator<OS extends Transform = Transform<I, unknown>>(
    schema: OS,
  ): Handler<InferInput<OS>, O, M, U, OS, T, C>;

  selector<OT extends Transform = Transform<O, unknown>>(
    transform: OT,
  ): Handler<I, InferOutput<OT>, M, U, S, OT, C>;

  action<OO = O>(
    action: (
      opts: C & {
        req: {
          input: unknown;
          parsedInput: I;
          pathParams: PathParams<U>;
          rawRequest: NextRequest;
        };
      },
    ) => Promise<NextResponse<OO>>,
  ): Handler<I, OO, M, U, S, T, C>;
};

type HandleBuilder<M extends string, C extends Record<string, unknown>> = <
  U extends string,
>(
  url: U,
  initialConfig?: C,
) => Handler<unknown, unknown, M, U, never, never, C>;

export type NextRouteRequest = HttpApiRequest & {
  rawRequest: NextRequest;
  params: Record<string, string | string[]>;
};

export class NextRoute<
  Req extends NextRouteRequest,
  Ctx extends ApiContext,
> extends BaseApi<Req, Ctx> {
  declare post: HandleBuilder<'POST', HttpApiConfig<Req>>;

  constructor(opts: {
    middlewares?: Middleware<Ctx, any>[];
    handleError?: HandleError<Ctx>;
  }) {
    super({
      middlewares: opts.middlewares ?? [],
      handleError: opts.handleError,
    });
  }

  private async createRequest(
    initialConfig: HttpRequest & {},
    req: NextRequest,
    route: { params: Record<string, string | string[]> },
  ) {
    const { method: _method, url: _url, ...initial } = initialConfig;
    const url = req.url;
    const method = req.method;

    // form data or json
    let input: any;
    if (req.body) {
      const contentType = req.headers.get('content-type');
      if (contentType === 'application/json') {
        input = await req.json();
      } else if (contentType === 'application/x-www-form-urlencoded') {
        const formData = await req.formData();
        input = Object.fromEntries(formData);
      } else {
        throw new Error('Unsupported content type');
      }
    }

    return {
      ...initial,
      input,
      parsedInput: undefined,
      params: route.params,
      rawRequest: req,
      method,
      url,
    } as Req;
  }

  private createNextRouteHandler(handlerOpts: {
    initialConfig: HttpApiConfig<Req> & HttpRequest;
    schema?: Transform;
    transform?: Transform;
    action?: AnyAsyncFn;
    handleError?: HandleError<Ctx>;
  }) {
    const handler: any = this.createHandler({
      createRequest: this.createRequest.bind(null, handlerOpts.initialConfig),
      action: handlerOpts.action ?? noop,
      inputSchema: handlerOpts.schema,
      outputSchema: handlerOpts.transform,
      handleError: handlerOpts.handleError ?? this.handleError,
    });

    handler.validator = (schema: Transform) =>
      this.createNextRouteHandler({
        ...handlerOpts,
        schema,
      });
    handler.action = (action: AnyAsyncFn) =>
      this.createNextRouteHandler({
        ...handlerOpts,
        action,
      });
    handler.selector = (transform: Transform) =>
      this.createNextRouteHandler({
        ...handlerOpts,
        transform,
      });

    return handler;
  }

  use<NC extends object>(middleware: Middleware<Ctx, NC>) {
    return new NextRoute<Req, Ctx & NC>({
      middlewares: [...this.middlewares, middleware],
    });
  }
}
