import { describe, it, expect } from "bun:test";
import { replaceUrlParams } from '../src/middleware.js';

describe('replaceUrlParams', () => {
  it('replace url params', async () => {
    const ctx: any = {
      http: async () => {},
      config: {
        method: 'GET',
        url: '/users/:id',
        params: { id: 1 },
      },
      parsedInput: { id: 1 },
    };

    replaceUrlParams({ excludePathParams: true })(ctx, () => Promise.resolve());
    expect(ctx.config.url).toBe('/users/1');
    expect(ctx.parsedInput).toEqual({});
  });

  it('disable remove path params', async () => {
    const ctx: any = {
      http: async () => {},
      config: {
        method: 'GET',
        url: '/users/:id',
        params: { id: 1 },
      },
      parsedInput: { id: 1 },
    };

    replaceUrlParams({ excludePathParams: false })(ctx, () => Promise.resolve());
    expect(ctx.config.url).toBe('/users/1');
    expect(ctx.parsedInput).toEqual({ id: 1 });
  });
});
