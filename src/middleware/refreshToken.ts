import type { AnyHttpRequest, HttpConfig, MiddlewareFn } from '../types.js';

/**
 * refresh token middleware, token expired will be refreshed automatically
 */
export function refreshToken<
  H extends AnyHttpRequest,
  R extends (...args: any[]) => Promise<any>,
>(options: {
  /** refresh token function, should return a promise, do replace token of http(config) here */
  refreshTokenFn: R;
  /** retry before refreshing, you should modify the config before retry */
  beforeRetry?: (
    config: HttpConfig<H>,
    refreshResult: Awaited<ReturnType<R>>,
  ) => HttpConfig<H>;
  /** should refresh or not */
  shouldRefresh: (error: any, config: HttpConfig<H>) => boolean;
}): MiddlewareFn<H> {
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
      if (!options.shouldRefresh(error, ctx.config)) {
        throw error;
      }

      if (!refreshing) {
        // create new refreshing
        refreshing = options.refreshTokenFn();
      }

      return refreshing
        .then((value) => {
          refreshing = null;
          return ctx.http(
            options.beforeRetry
              ? options.beforeRetry(ctx.config, value)
              : ctx.config,
          );
        })
        .catch((error) => {
          // Failed again
          throw error;
        })
        .then((output) => {
          ctx.output = output;
        });
    }
  };
}
