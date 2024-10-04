import type { Context, MiddlewareFn } from '../types.js';

/**
 * refresh token middleware, token expired will be refreshed automatically
 */
export function refreshToken<
  C extends Context,
  R extends (...args: any[]) => Promise<any>,
>(options: {
  /** refresh token function, should return a promise, do replace token of http(config) here */
  refreshTokenFn: R;
  /** retry before refreshing, you should modify the config before retry */
  beforeRetry?: (
    refreshResult: Awaited<ReturnType<R>>,
    context: C,
  ) => C | Promise<C>;
  /** should refresh or not */
  shouldRefresh: (error: any, context: C) => boolean;
}): MiddlewareFn<C> {
  let refreshing: Promise<any> | null = null;

  return async (ctx, next) => {
    // new request wait for refreshing
    if (refreshing) {
      return refreshing.then(() => next());
    }

    try {
      // ... request ...
      await next();
    } catch (error) {
      // check if need to refresh token
      if (!options.shouldRefresh(error, ctx)) {
        throw error;
      }

      if (!refreshing) {
        // create new refreshing
        refreshing = options.refreshTokenFn();
      }

      return refreshing
        .catch((error) => Promise.reject(error))
        .then((value) => options.beforeRetry?.(value, ctx))
        .then(() => ctx.dispatch())
        .then((output) => {
          ctx.data = output;
        })
        .finally(() => {
          refreshing = null;
        });
    }
  };
}
