import type { Middleware } from '../../compose.js';
import type { HttpApiRequest } from '../../types.js';

function isObject(value: any): value is Record<string, any> {
  return typeof value === 'object' && !Array.isArray(value) && value !== null;
}

export interface ReplaceUrlParamsOptions {
  /**
   * Exclude path params in input
   * @default true
   */
  excludePathParams?: boolean;
}

/**
 * Replace url params with input. e.g. `/users/:id` to `/users/1`
 */
export function replaceUrlParams(
  options: ReplaceUrlParamsOptions = {},
): Middleware<any, any> {
  return async (opts) => {
    const { req } = opts as unknown as { req: HttpApiRequest };
    const { excludePathParams = true } = options;
    // replace url params with input
    const params = req.url.match(/:\w+/g);

    if (params) {
      (req as any).originalUrl = req.url;

      let nextUrl = req.url;
      for (const param of params) {
        const key = param.slice(1);
        if (isObject(req.input)) {
          const value = req.input[key];
          if (typeof value === 'number' || typeof value === 'string') {
            nextUrl = nextUrl.replace(
              param,
              value.toString().replace(/\s/g, ''),
            );
            // remove path params
            excludePathParams === true && delete req.input[key];
          }
        } else {
          console.warn(`Bad params ${key} data.`);
        }
      }
      req.url = nextUrl;
    }

    return opts.next();
  };
}
