import type { NextRequest, NextResponse } from 'next/server.js';
import { type ApiOptions, BaseApi, type HandleError } from '../api.js';
import type {
  AnyAsyncFn,
  ApiContext,
  ApiRequest,
  ExtractRequestConfig,
  InferInput,
  InferOutput,
  Prettify,
  Transform,
} from '../types.js';
import type { Middleware } from '../compose.js';
import { noop } from './noop.js';

// extract the path params from the url
export type PathParams<U extends string> =
  U extends `${infer _}[[...${infer P}]]${infer __}`
    ? { [K in P]?: string[] }
    : U extends `${infer _}[...${infer P}]${infer __}`
      ? { [K in P]: string[] }
      : U extends `${infer _}[${infer P}]${infer R}`
        ? Prettify<{ [K in P]: string } & PathParams<R>>
        : {};

export type NextRouteRequest = ApiRequest & {
  rawRequest: NextRequest;
  pathParams: Record<string, string | string[]>;
};

export type NextRouteRequestConfig<Req extends ApiRequest> =
  ExtractRequestConfig<Req, NextRouteRequest>;

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

type HandleBuilder<M extends string, C extends Record<string, unknown>> = {
  <U extends string, IC extends C = C>(
    url: U,
    initialConfig?: IC,
  ): Handler<unknown, unknown, M, U, never, never, IC>;
  <IC extends C = C>(
    initialConfig?: IC,
  ): Handler<unknown, unknown, M, '', never, never, IC>;
};

export type NextRouteOptions<
  _Req extends NextRouteRequest,
  Ctx extends ApiContext,
> = ApiOptions<Ctx>;

export class NextRoute<
  Req extends NextRouteRequest,
  Ctx extends ApiContext,
> extends BaseApi<Req, Ctx> {
  declare get: HandleBuilder<'GET', NextRouteRequestConfig<Req>>;
  declare post: HandleBuilder<'POST', NextRouteRequestConfig<Req>>;
  declare put: HandleBuilder<'PUT', NextRouteRequestConfig<Req>>;
  declare patch: HandleBuilder<'PATCH', NextRouteRequestConfig<Req>>;
  declare delete: HandleBuilder<'DELETE', NextRouteRequestConfig<Req>>;
  declare head: HandleBuilder<'HEAD', NextRouteRequestConfig<Req>>;
  declare options: HandleBuilder<'OPTIONS', NextRouteRequestConfig<Req>>;

  constructor(opts: NextRouteOptions<Req, Ctx>) {
    super({
      middlewares: opts.middlewares,
      handleError: opts.handleError,
    });
    const allMethods = [
      'get',
      'post',
      'put',
      'patch',
      'delete',
      'head',
      'options',
    ];
    for (const method of allMethods) {
      this[method] = (...args: any[]) => {
        const url = typeof args[0] === 'string' ? args[0] : '';
        const initialConfig = typeof args[0] === 'object' ? args[0] : args[1];
        return this.createNextRouteHandler({
          initialConfig: {
            ...initialConfig,
            method: method.toUpperCase(),
            url,
          },
        });
      };
    }
  }

  protected createRequest(initialConfig: { method: string; url: string }) {
    return async (
      req: NextRequest,
      route: {
        params:
          | Record<string, string | string[]>
          | Promise<Record<string, string | string[]>>;
      },
    ) => {
      const { method: _method, url: _url, ...initial } = initialConfig;
      const url = req.url;
      const method = req.method;

      // form data or json
      let input: any;

      // todo better content type handling
      if (method === 'GET') {
        input = Object.fromEntries(req.nextUrl.searchParams);
      } else if (req.body) {
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
        pathParams:
          // in nextjs 15, route.params is a promise
          typeof route?.params?.then === 'function'
            ? await route.params
            : route?.params,
        rawRequest: req,
        method,
        url,
      } as Req;
    };
  }

  private createNextRouteHandler(handlerOpts: {
    initialConfig: { method: string; url: string };
    schema?: Transform;
    transform?: Transform;
    action?: AnyAsyncFn;
    handleError?: HandleError<Ctx>;
  }) {
    const handler: any = this.createHandler({
      createRequest: this.createRequest(handlerOpts.initialConfig),
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
