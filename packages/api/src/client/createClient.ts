import type { Env, ApiContext, ApiRequest, Prettify } from '../types.js';
import { ApiClient, type ApiClientOptions } from './client.js';

/**
 * Create a new ApiClient
 *
 * @example
 * ```ts
 * // create a client
 * const client = createClient();
 *
 * // create a client with custom types
 * const client createClient<{
 *   Req: {
 *     // ...custom request config
 *     headers?: Record<string, string>;
 *   },
 *   Ctx: {
 *     // ...custom context
 *     user?: { id: string }
 *   },
 * }>({ ... });
 *
 * client.post('/users', {})
 *                     // ^type: { headers?: Record<string, string> }
 *
 * client.use(async ({ ctx }) => {
 *                  // ^type: { user?: { id: string } }
 * })
 * ```
 */
export function createClient<E extends Env>(
  opts: ApiClientOptions<
    E extends { Req: infer R } ? Prettify<R & ApiRequest> : ApiRequest,
    E extends { Ctx: infer C } ? Prettify<C & ApiContext> : ApiContext
  >,
) {
  return new ApiClient(opts);
}
