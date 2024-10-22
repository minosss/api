import type { Middleware } from './types.js';

interface ComposeContext {
  output: unknown;
  error?: Error;
}

export function compose<C extends ComposeContext>(
  middlewares: Middleware<any, any>[],
  onError?: (c: C) => Promise<any>,
) {
  return function composed(ctx: C, next?: Middleware<any, any>) {
    let index = -1;
    return dispatch(0);

    async function dispatch(i: number) {
      if (i <= index) {
        throw new Error('next() called multiple times');
      }
      index = i;

      let output: any;
      let handler: any;
      let isError = false;

      if (middlewares[i]) {
        handler = middlewares[i];
      } else {
        handler = (index === middlewares.length && next) || undefined;
      }

      if (handler) {
        try {
          output = await handler(
            ctx,
            () => dispatch(i + 1),
          );
        } catch (error) {
          if (error instanceof Error && onError) {
            ctx.error = error;
            output = await onError(ctx);
            isError = true;
          } else {
            throw error;
          }
        }
      }

      if (output !== undefined && (ctx.output === undefined || isError)) {
        ctx.output = output;
      }

      return ctx;
    }
  };
}
