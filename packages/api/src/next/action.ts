import { type ApiOptions, BaseApi, type HandleError } from '../api.js';
import type { Middleware } from '../compose.js';
import { ApiError } from '../error.js';
import type {
  ApiContext,
  InferInput,
  InferOutput,
  Transform,
  IfUnknown,
  ExtractRequestConfig,
  AnyAsyncFn,
  ExtractPathParams,
  Prettify,
  Options,
  ApiRequest,
} from '../types.js';
import { validate } from '../validate.js';
import { noop } from './noop.js';

export type NextActionRequest = ApiRequest & {
  parsedBindArgs: unknown[];
  state: unknown;
};

export type NextActionRequestConfig<Req extends NextActionRequest> =
  ExtractRequestConfig<Req, NextActionRequest>;

type InitialConfig = {
  withState?: boolean;
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
  B extends readonly Transform[] = [],
  E = unknown,
  C extends Record<string, unknown> = {},
> = {
  /**
   * @param schema - input validation schema
   */
  validator<OS extends Transform = Transform<I, unknown>>(
    schema: OS,
  ): Handler<InferInput<OS>, O, M, U, S, T, B, E, C>;

  /**
   * @param transform - output transformation schema
   */
  selector<OT extends Transform = Transform<O, unknown>>(
    transform: OT,
  ): Handler<I, InferOutput<OT>, M, U, S, OT, B, E, C>;

  /**
   * define the action should returns a state. e.g. state<{ message: string; code: number; data: unknown }>()
   */
  state<OE extends Record<string, unknown>>(): Handler<
    I,
    OE,
    M,
    U,
    S,
    T,
    [],
    OE,
    C
  >;

  /**
   * Passing additional arguments to the action handler.
   *
   * @link https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations#passing-additional-arguments
   * @param schema - bind arguments validation schema
   */
  bindArgs<const OB extends readonly Transform[]>(
    schema: OB,
  ): Handler<I, O, M, U, S, T, OB, unknown, C>;

  /**
   * Do something with the input data.
   *
   * @param action - action handler function
   */
  action<OO = O>(
    action: (
      opts: Prettify<
        C & {
          req: {
            input: unknown;
            parsedInput: I;
            parsedBindArgs: InferInputArray<B>;
          };
        }
      >,
    ) => Promise<IfUnknown<E, OO, E>>,
  ): ActionHandler<I, OO, M, U, S, T, B, E, C>;
};

type MaybeFormData<T> = T | FormData;

type InferInputArray<B extends readonly Transform[]> = {
  [K in keyof B]: InferInput<B[K]>;
};

type ActionHandler<
  I,
  O,
  M,
  U,
  S,
  _T,
  B extends readonly Transform[],
  E,
  C,
> = IfUnknown<
  E,
  // use bind args
  {
    (
      ...args: [...bindArgs: InferInputArray<B>, input: MaybeFormData<I>]
    ): Promise<O>;

    /**
     * maybe we want to pick some data from the output. e.g. take name of user or email
     *
     * @param transform - output transformation schema
     */
    selector<OT extends Transform = Transform<O, unknown>>(
      transform: OT,
    ): ActionHandler<I, InferOutput<OT>, M, U, S, OT, B, E, C>;
  },
  // use state
  (prevState: E, input: MaybeFormData<I>) => Promise<E>
>;

export type NextActionOptions<
  _Req extends NextActionRequest,
  Ctx extends ApiContext,
> = ApiOptions<Ctx>;

/**
 *
 * @example
 *
 * const na = new NextAction({});
 *
 * const action1 = na
 *   .post({ ...initial })
 *   .validator(schema) // input validation
 *   .bindArgs([schema, schema]) // bind arguments
 *   .action(async () => {
 *     // do something
 *   })
 *   .selector(schema) // select data, e.g. take name of user or email
 * // action1(arg1, arg2, formData / input)
 *
 * const action2 = na
 *   .post()
 *   .validator(schema)
 *   .state<State>()
 *   .action(async () => {});
 * // action2(prevState, formData / input)
 */
export class NextAction<
  Req extends NextActionRequest,
  Ctx extends ApiContext,
> extends BaseApi<Req, Ctx> {
  constructor(opts: NextActionOptions<Req, Ctx>) {
    super({
      middlewares: opts.middlewares,
      handleError: opts.handleError,
    });
  }

  // Behind the scenes, actions use the POST method, and only this HTTP method can invoke them.
  post<
    U extends string,
    C extends NextActionRequestConfig<Req> = NextActionRequestConfig<Req>,
  >(
    /** url is optional, if not provided, it will be empty string */
    url: U,
    initialConfig?: C,
  ): Handler<
    ExtractPathParams<U>,
    unknown,
    'POST',
    U,
    never,
    never,
    [],
    unknown,
    Prettify<Options & { req: C & Req; ctx: Ctx }>
  >;
  post<C extends NextActionRequestConfig<Req> = NextActionRequestConfig<Req>>(
    initialConfig?: C,
  ): Handler<
    unknown,
    unknown,
    'POST',
    '',
    never,
    never,
    [],
    unknown,
    Prettify<Options & { req: C & Req; ctx: Ctx }>
  >;
  post(...args: any[]) {
    const url = typeof args[0] === 'string' ? args[0] : '';
    const initialConfig = typeof args[0] === 'object' ? args[0] : args[1];

    return this.createNextActionHandler({
      initialConfig: {
        ...initialConfig,
        withState: false,
        method: 'POST',
        url,
      },
    });
  }

  protected createRequest(
    initialConfig: InitialConfig,
    bindArgsSchema: Transform[],
  ) {
    return async (...args: any[]) => {
      const { method, url, withState, ...initial } = initialConfig;

      let inputData = args[0];
      let state: any;
      let parsedBindArgs: any[] = [];

      if (withState) {
        state = args[0];
        inputData = args[1];
      } else if (Array.isArray(bindArgsSchema) && bindArgsSchema.length > 0) {
        const bindArgs = args.slice(0, bindArgsSchema.length);
        inputData = args[bindArgsSchema.length];

        if (bindArgs.length !== bindArgsSchema.length) {
          throw new ApiError({
            code: ApiError.CODE_BAD_INPUT,
            message: `Expected ${bindArgsSchema.length} bind arguments, but got ${bindArgs.length}`,
          });
        }

        parsedBindArgs = await Promise.all(
          bindArgsSchema.map(async (schema, i) => {
            return await validate(schema, bindArgs[i]);
          }),
        );
      }

      const input =
        inputData instanceof FormData
          ? Object.fromEntries(inputData)
          : inputData;

      return {
        ...initial,
        input,
        parsedInput: undefined,
        state,
        parsedBindArgs,
        method,
        url,
      } as Req;
    };
  }

  private createNextActionHandler(handlerOpts: {
    initialConfig: InitialConfig;
    schema?: Transform;
    transform?: Transform;
    bindArgsSchema?: any[];
    action?: AnyAsyncFn;
    handleError?: HandleError<Ctx>;
  }) {
    const handler: any = this.createHandler({
      createRequest: this.createRequest(
        handlerOpts.initialConfig,
        handlerOpts.bindArgsSchema ?? [],
      ),
      action: handlerOpts.action ?? noop,
      inputSchema: handlerOpts.schema,
      outputSchema: handlerOpts.transform,
      handleError: handlerOpts.handleError ?? this.handleError,
    });
    handler.validator = (schema: Transform) =>
      this.createNextActionHandler({
        ...handlerOpts,
        schema,
      });
    handler.bindArgs = (bindArgsSchema: Transform[]) =>
      this.createNextActionHandler({
        ...handlerOpts,
        bindArgsSchema,
      });
    handler.action = (action: AnyAsyncFn) =>
      this.createNextActionHandler({
        ...handlerOpts,
        action,
      });
    handler.selector = (transform: Transform) =>
      this.createNextActionHandler({
        ...handlerOpts,
        transform,
      });
    handler.state = () =>
      this.createNextActionHandler({
        ...handlerOpts,
        initialConfig: {
          ...handlerOpts.initialConfig,
          withState: true,
        },
      });

    return handler;
  }

  use<NC extends object>(middleware: Middleware<Ctx, NC>) {
    return new NextAction<Req, Ctx & NC>({
      middlewares: [...this.middlewares, middleware],
    });
  }
}
