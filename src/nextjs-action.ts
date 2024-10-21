import { ApiBase, type ApiContext, type ApiOptions } from './api-base.js';
import { compose } from './compose.js';
import type {
  AnyAsyncFn,
  Env,
  InferInput,
  InferOutput,
  Middleware,
  Transform,
} from './types.js';
import { validate } from './validate.js';

export interface ApiActionHandlerOptions {
  initialConfig: object | undefined;
  schema: Transform | undefined;
  bindArgsSchema: Transform[] | undefined;
  action: AnyAsyncFn;
}

type Handler<I, O, B extends Transform[]> = B extends [] // if bindArgs is empty
  ? {
      (input: I): Promise<O>;
      (prevState: unknown, formData: FormData): Promise<O>;
    }
  : B extends [Transform]
    ? (
        prevState: unknown,
        arg1: InferOutput<B[0]>,
        formData: FormData,
      ) => Promise<O>
    : B extends [Transform, Transform]
      ? (
          prevState: unknown,
          arg1: InferOutput<B[0]>,
          arg2: InferOutput<B[1]>,
          formData: FormData,
        ) => Promise<O>
      : B extends [Transform, Transform, Transform]
        ? (
            prevState: unknown,
            arg1: InferOutput<B[0]>,
            arg2: InferOutput<B[1]>,
            arg3: InferOutput<B[2]>,
            formData: FormData,
          ) => Promise<O>
        : B extends [Transform, Transform, Transform, Transform]
          ? (
              prevState: unknown,
              arg1: InferOutput<B[0]>,
              arg2: InferOutput<B[1]>,
              arg3: InferOutput<B[2]>,
              arg4: InferOutput<B[3]>,
              formData: FormData,
            ) => Promise<O>
          : B extends [Transform, Transform, Transform, Transform, Transform]
            ? (
                prevState: unknown,
                arg1: InferOutput<B[0]>,
                arg2: InferOutput<B[1]>,
                arg3: InferOutput<B[2]>,
                arg4: InferOutput<B[3]>,
                arg5: InferOutput<B[4]>,
                formData: FormData,
              ) => Promise<O>
            : never;

type RequestHandler<I, O, S extends Transform, B extends Transform[]> = Handler<
  I,
  O,
  B
> & {
  validator<OS extends Transform>(
    schema: OS,
  ): RequestHandler<InferInput<OS>, O, OS, B>;

  bindArgs<AA extends [Transform]>(args: AA): RequestHandler<I, O, S, AA>;
  bindArgs<AA extends [Transform, Transform]>(
    bindArgsSchema: AA,
  ): RequestHandler<I, O, S, AA>;
};

export type ApiActionContext<E extends Env> = {
  config: {
    prevState: unknown;
    bindArgs: unknown[];
  };
  input: unknown;
  output: unknown;
  action: AnyAsyncFn;
} & ApiContext<E>;

export type ApiActionOptions<E extends Env> = ApiOptions<E> & {};

const noop = async () => null;

/**
 * @example
 * const aa = new ApiAction({ ... });
 *
 * const createUser = aa
 *   .post({ ... })
 *   .validator(z.object({
 *     email: z.string().email(),
 *     password: z.string().min(6),
 *   }))
 *   .action(async ({ input, bindArgs, prevState }, context) => {
 *     // return output
 *   })
 *
 * // bind args
 * const updateUser = aa
 *   .post({ ... })
 *   .validator(z.object({
 *     email: z.string().email(),
 *   }))
 *   .bindArgs([z.string()])
 *   .action(async ({ input, bindArgs: [id] }) => {
 *     //
 *   });
 * const updateUserWithId = updateUser.bind(null, userId);
 */
export class ApiAction<E extends Env> extends ApiBase<E> {
  constructor(opts: ApiActionOptions<E>) {
    super({
      mergeConfig: opts.mergeConfig,
      middlewares: opts.middlewares,
      onError: opts.onError,
    });
  }

  // server action only post method
  post(initialConfig?: ApiActionHandlerOptions['initialConfig']) {
    return this.createOverrideHandler(
      {
        initialConfig,
        schema: undefined,
        bindArgsSchema: undefined,
        action: noop,
      },
      this.createHandler.bind(this),
      {
        validator: 'schema',
        action: 'action',
        bindArgs: 'bindArgsSchema',
      },
    ) as RequestHandler<unknown, unknown, never, []>;
  }

  use<NC extends object>(middleware: Middleware<ApiActionContext<E>, NC>) {
    return new ApiAction<E>({
      mergeConfig: this.mergeConfig,
      middlewares: [...this.middlewares, middleware],
      onError: this.onError,
    });
  }

  private createHandler(handlerOpts: ApiActionHandlerOptions) {
    return async (...args: unknown[]) => {
      // (state, ..., fromData) (if last arg is form data, first arg should be state)
      // ot direct execution (input)
      const isFormData = args.length >= 2 && args.at(-1) instanceof FormData;

      let input: unknown;
      let prevState: unknown = undefined;
      let bindArgs: unknown[] = [];
      if (isFormData) {
        const formData = args.at(-1) as FormData;
        prevState = args.at(0);
        bindArgs = args.slice(1, -1);
        // todo better parsing form data?
        input = Object.fromEntries(formData);
      } else {
        input = args[0];
      }

      const context = await compose(
        [
          // setup request context
          async (c, next) => {
            const config = {
              prevState,
              bindArgs,
            };

            if (
              handlerOpts.bindArgsSchema &&
              handlerOpts.bindArgsSchema.length > 0
            ) {
              // check args length
              if (bindArgs.length !== handlerOpts.bindArgsSchema.length) {
                throw new Error('Invalid bind args');
              }

              // validate bind args
              const validatedBindArgs = await Promise.all(
                handlerOpts.bindArgsSchema.map(async (schema, i) => {
                  return await validate(schema, bindArgs[i]);
                }),
              );

              // assign validated bind args
              config.bindArgs = validatedBindArgs;
            }
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
      )({ output: undefined }, async (c) => {
        const output = await c.action(
          {
            ...c.config,
            input: c.input,
          },
          c,
        );

        return output;
      });

      return context.output;
    };
  }
}
