import { compose, type Middleware } from './compose.js';
import { ApiError } from './error.js';
import type {
  AnyAsyncFn,
  ApiContext,
  ApiRequest,
  ApiResponse,
  Transform,
} from './types.js';
import { validate } from './validate.js';

export class BaseApi<Req extends ApiRequest, Ctx extends ApiContext> {
  protected middlewares: Middleware<any, any>[];

  constructor(opts: {
    middlewares: Middleware<any, any>[];
  }) {
    this.middlewares = opts.middlewares;
  }

  protected createHandler(opts: {
    inputSchema: Transform | undefined;
    outputSchema: Transform | undefined;
    createRequest: (...args: any[]) => Promise<Req>;
    action: AnyAsyncFn;
  }): (...args: any[]) => Promise<any> {
    return async (...args: any[]) => {
      // request
      let req: any;
      try {
        req = await opts.createRequest(...args);
        if (opts.inputSchema) {
          req.parsedInput = await validate(opts.inputSchema, req.input);
        }
      } catch (error) {
        throw new ApiError({
          message: 'The input is not valid.',
          code: ApiError.CODE_BAD_INPUT,
          cause: error,
        });
      }

      const ctx = {} as Ctx;
      const res: ApiResponse = {
        output: undefined,
        ok: false,
      };
      const execute = () =>
        opts.action({
          ctx,
          req,
        });

      await compose(this.middlewares)(
        {
          ctx,
          req,
          res,
          execute,
        } as any,
        async (opts) => {
          res.output = await execute();
          res.ok = true;
          return opts.next();
        },
      );

      if (!res.ok) {
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

      return res.output;
    };
  }
}
