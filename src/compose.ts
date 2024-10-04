import type { MiddlewareFn, Context } from './types.js';
// instead of hono/compose
export function compose<C extends Context>(
  middlewares: MiddlewareFn<C>[],
  onError?: (error: Error, ctx: C) => Promise<any>,
): (c: C) => Promise<C> {
  return function composed(ctx: C) {
    let index = -1;
    return dispatch(0);

    async function dispatch(i: number) {
      if (i <= index) {
        throw new Error('next() called multiple times');
      }
      index = i;

      let data: unknown;
      let isError = false;
      const handler = middlewares[i];

      if (handler) {
        try {
          data = await handler(ctx, () => dispatch(i + 1));
        } catch (error) {
          if (error instanceof Error && onError) {
            ctx.error = error;
            data = await onError(error, ctx);
            isError = true;
          } else {
            throw error;
          }
        }
      }

      if (data && (ctx.finalized === false || isError)) {
        ctx.data = data;
        ctx.finalized = true;
      }

      return ctx;
    }
  };
}
