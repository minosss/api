import type { AnyAsyncFn, ApiResponse, Options, SomeObject } from './types.js';

export type MiddlewareOptions<Ctx> = Options & {
  ctx: Ctx;
  execute: AnyAsyncFn;
  res: ApiResponse;
};

export type Middleware<Ctx, NextCtx extends SomeObject = SomeObject> = (
  opts: MiddlewareOptions<Ctx> & {
    next: <NC extends SomeObject>(opts?: {
      ctx?: NC;
    }) => Promise<MiddlewareOptions<Ctx & NC>>;
  },
  // biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
) => Promise<void | MiddlewareOptions<Ctx & NextCtx>>;

export function compose(middlewares: Middleware<any>[]) {
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

      let handler: Middleware<any> | undefined;
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
