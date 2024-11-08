import type { Middleware } from '../../compose.js';
import type { AnyAsyncFn } from '../../types.js';

/**
 * refresh token middleware, token expired will be refreshed automatically
 */
export function refreshToken<R extends AnyAsyncFn>(options: {
  /** refresh token function, should return a promise, do replace token of http(config) here */
  refreshTokenFn: R;
  /** retry before refreshing, you should modify the config before retry */
  beforeRetry: (
    refreshResult: Awaited<ReturnType<R>>,
    context: unknown,
  ) => Promise<any>;
  /** should refresh or not */
  shouldRefresh: (error: unknown, context: unknown) => boolean;
}): Middleware<any, any> {
  let refreshing: Promise<any> | null = null;

  return async (opts) => {
    // new request wait for refreshing
    if (refreshing) {
      return refreshing.then(() => opts.next());
    }

    try {
      // ... request ...
      await opts.next();
    } catch (error) {
      // check if need to refresh token
      if (!options.shouldRefresh(error, {})) {
        throw error;
      }

      if (!refreshing) {
        // create new refreshing
        refreshing = options.refreshTokenFn();
      }

      return refreshing
        .catch((error) => Promise.reject(error))
        .then((value) => options.beforeRetry?.(value, {}))
        .then(async () => {
          opts.res.output = await opts.execute();
          opts.res.ok = true;
        })
        .finally(() => {
          refreshing = null;
        });
    }
  };
}
