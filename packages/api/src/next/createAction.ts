import type { ApiContext, Env, Prettify } from '../types.js';
import {
  NextAction,
  type NextActionOptions,
  type NextActionRequest,
} from './action.js';

/**
 * Create a new NextAction
 *
 * @example
 * ```ts
 * // create an action client
 * const action = createAction({});
 *
 * const createUser = action
 *   .post({
 *     actionName: 'createUser',
 *   })
 *   .validator(z.object({
 *     name: z.string(),
 *     age: z.number(),
 *   }))
 *   .bindArgs([z.string()])
 *   .action(async ({ req }) => {
 *     req.parsedBindArgs
 *     // ^type: [string]
 *     req.parsedInput
 *     // ^type: { name: string, age: number }
 *     req.actionName
 *     // ^type: string
 *
 *     return { ...result };
 *   });
 * ```
 */
export function createAction<E extends Env>(
  opts: NextActionOptions<
    E extends { Req: infer R }
      ? Prettify<R & NextActionRequest>
      : NextActionRequest,
    E extends { Ctx: infer C } ? Prettify<C & ApiContext> : ApiContext
  >,
) {
  return new NextAction(opts);
}
