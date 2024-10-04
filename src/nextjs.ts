import { type NextRequest, NextResponse } from 'next/server.js';
import type { AnyPromiseFn, Action, Context, InferInput, MiddlewareFn, Transform } from './types.js';
import { compose } from './compose.js';
import { validate } from './validate.js';

export interface Api<C extends Context> {
  use: <NC>(middleware: MiddlewareFn<C & Partial<NC>>) => Api<C & NC>;

  validator: <S extends Transform>(
    schema: S,
  ) => ({
    action: <A extends Action<C, InferInput<S>>>(
      action: A,
    ) => ({
      (req: NextRequest, opts: { params: Record<string, string> }): Promise<NextResponse>;
      _input: InferInput<S>;
      _output: Awaited<ReturnType<A>>;
    });
  })
}

/**
 * Define nextjs route handler
 */
export function createApi<C extends Context>(
  opts: {
    middleware?: MiddlewareFn<C>[];
    onError?: (error: Error) => Promise<any>;
  }
) {
  return {
    use: (middleware: MiddlewareFn<C>) => createApi({
      middleware: [...(opts.middleware ?? []), middleware],
    }),
    validator: (schema: Transform) => ({
      action: (action: AnyPromiseFn) => async (req: NextRequest, { params = {} }) => {
        const searchParams = Object.fromEntries(req.nextUrl.searchParams);
        let input = {
          ...searchParams,
          ...params,
        };
        input = validate(schema, input);

        const config = {
          method: req.method,
          url: req.url,
          data: input,
        };
        const c = {
          config,
          dispatch: async () => action(config, c),
          data: undefined,
          finalized: false,
        } as C;

        const ctx = await compose<C>([
          ...opts.middleware ?? [],
          async (c) => c.dispatch(),
        ], opts.onError)(c);

        const output = ctx.data;
        if (output instanceof NextResponse) {
          return output;
        }
        return NextResponse.json(output, {
          status: 200,
        });
      }
    }),
  } as unknown as Api<C>;
}
