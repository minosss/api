import type { AnyAsyncFn, ApiResponse, Options } from './types.js';

export type MiddlewareOptions<Ctx> = Options & {
  ctx: Ctx;
  execute: AnyAsyncFn;
  res: ApiResponse;
};

export type Middleware<Ctx, _NextCtx> = (
  opts: MiddlewareOptions<Ctx> & {
    next: <NC extends object>(opts?: { ctx?: NC }) => Promise<any>;
  },
) => Promise<any>;

export function compose(middlewares: Middleware<any, any>[]) {
  return function composed(
    opts: MiddlewareOptions<any>,
    next?: (opts: any) => Promise<any>,
  ) {
    let index = -1;
    return dispatch(0);

    async function dispatch(i: number) {
      if (i <= index) {
        throw new Error('next() called multiple times');
      }
      index = i;

      let handler: Middleware<any, any> | undefined;
      if (middlewares[i]) {
        handler = middlewares[i];
      } else {
        handler = (index === middlewares.length && next) || undefined;
      }

      if (handler) {
        await handler({
          ...opts,
          next: async (nextOpts) => {
            Object.assign(opts.ctx, nextOpts?.ctx ?? {});
            await dispatch(i + 1);
            return opts;
          },
        });
      }

      return opts;
    }
  };
}
