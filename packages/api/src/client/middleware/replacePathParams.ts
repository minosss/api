import type { Middleware } from '../../compose.js';
import type { HttpApiRequest } from '../../types.js';

function isObject(value: any): value is Record<string, any> {
  return typeof value === 'object' && !Array.isArray(value) && value !== null;
}

export interface ReplacePathParamsOptions {
  /**
   * Exclude path params in input
   * @default true
   */
  excludePathParams?: boolean;
}

export type ReplacePathParamsRequest = {
  rawUrl: string;
};

/**
 * Replace url params with input. e.g. `/users/[id]` to `/users/1`
 */
export function replacePathParams(
  options: ReplacePathParamsOptions = {},
): Middleware<any, any> {
  return async (opts) => {
    const { req } = opts as unknown as {
      req: HttpApiRequest & ReplacePathParamsRequest;
    };
    const { excludePathParams = true } = options;
    // replace url params with input
    const params = req.url.match(/\[\w+\]/g);

    if (params) {
      req.rawUrl = req.url;

      let nextUrl = req.url;
      for (const param of params) {
        // remove brackets
        const key = param.slice(1, -1);
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
