import type { MiddlewareFn } from '../types.js';

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
): MiddlewareFn {
  return async (ctx, next) => {
    const { excludePathParams = true } = options;
    // replace url params with input
    const params = ctx.config.url.match(/:\w+/g);

    if (params) {
      let url = ctx.config.url;
      const input = ctx.config.data;
      for (const param of params) {
        const key = param.slice(1);
        if (isObject(input)) {
          const value = input[key];
          if (typeof value === 'number' || typeof value === 'string') {
            url = url.replace(param, value.toString().replace(/\s/g, ''));
            // remove path params
            excludePathParams === true && delete input[key];
          }
        } else {
          console.warn(`Bad params ${key} data.`);
        }
      }
      ctx.config.url = url;
    }

    return next();
  };
}
