import { compose, type MiddlewareOptions, type Middleware } from './compose.js';
import { ApiError } from './error.js';
import type {
  AnyAsyncFn,
  ApiContext,
  ApiRequest,
  ApiResponse,
  Transform,
} from './types.js';
import { validate } from './validate.js';

export type HandleError<C, E = any> = (
  err: unknown,
  opts: MiddlewareOptions<C>,
) => Promise<E>;

export type ApiOptions<Ctx extends ApiContext> = {
  middlewares?: Middleware<Ctx>[];
  handleError?: HandleError<Ctx>;
};

export abstract class BaseApi<Req extends ApiRequest, Ctx extends ApiContext> {
  protected middlewares: Middleware<any>[];
  protected handleError?: HandleError<Ctx>;

  constructor(opts: ApiOptions<Ctx>) {
    this.middlewares = opts.middlewares ?? [];
    this.handleError = opts.handleError;
  }

  protected abstract createRequest(...args: unknown[]): AnyAsyncFn<Req>;

  protected createHandler(opts: {
    inputSchema?: Transform;
    outputSchema?: Transform;
    createRequest: AnyAsyncFn<Req>;
    action: AnyAsyncFn;
    handleError?: HandleError<Ctx>;
  }): AnyAsyncFn {
    return async (...args: any[]) => {
      // request
      const req = await opts.createRequest(...args);
      const ctx = {} as Ctx;
      const res: ApiResponse = {
        output: undefined,
      };
      const execute = () =>
        opts.action({
          ctx,
          req,
        });

      try {
        if (opts.inputSchema) {
          try {
            req.parsedInput = await validate(opts.inputSchema, req.input);
          } catch (error) {
            throw new ApiError({
              message: 'The input is not valid.',
              code: ApiError.CODE_BAD_INPUT,
              cause: error,
            });
          }
        }

        await compose(this.middlewares)(
          {
            ctx,
            req,
            res,
            execute,
          } as any,
          async (opts) => {
            res.output = await execute();
            return opts.next();
          },
        );

        if (res.output === undefined) {
          throw new ApiError({
            message:
              'The action function or middleware(s) did not set a valid output. Please ensure the output is defined and valid.',
            code: ApiError.CODE_BAD_REQUEST,
          });
        }

        if (opts.outputSchema) {
          try {
            return await validate(opts.outputSchema, res.output);
          } catch (error) {
            throw new ApiError({
              message: 'The output is not valid.',
              code: ApiError.CODE_BAD_OUTPUT,
              cause: error,
            });
          }
        }
      } catch (error) {
        if (opts.handleError) {
          res.output = await opts.handleError(error, {
            ctx,
            req,
            res,
            execute,
          });
        } else {
          throw error;
        }
      }

      return res.output;
    };
  }
}
