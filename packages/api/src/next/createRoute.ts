import type { ApiContext, Env, Prettify } from '../types.js';
import {
  NextRoute,
  type NextRouteOptions,
  type NextRouteRequest,
} from './route.js';

/**
 * Create a new NextRoute
 *
 * @example
 * ```ts
 * const route = createRoute({});
 *
 * const GET = route
 *   .get('/users/[id]')
 *   .action(async ({ req }) => {
 *     req.pathParams;
 *     // ^type: { id: string }
 *     return NextResponse.json({ ...result })
 *   });
 * ```
 */
export function createRoute<E extends Env>(
  opts: NextRouteOptions<
    E extends { Req: infer R }
      ? Prettify<R & NextRouteRequest>
      : NextRouteRequest,
    E extends { Ctx: infer C } ? Prettify<C & ApiContext> : ApiContext
  >,
) {
  return new NextRoute(opts);
}
