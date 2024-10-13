import { describe, it, expect } from 'bun:test';
import { compose } from '../src/compose.js';
import type { Middleware } from '../src/types.js';

describe('compose', () => {
  it('should execute middlewares in order', async () => {
    const middleware1: Middleware<any, any> = async (ctx, next) => {
      ctx.output = 'middleware1';
      await next();
    };

    const middleware2: Middleware<any, any> = async (ctx, next) => {
      ctx.output += ' middleware2';
      await next();
    };

    const composed = compose([middleware1, middleware2]);
    const ctx = await composed({ output: undefined });

    expect(ctx.output).toBe('middleware1 middleware2');
  });

  it('should handle errors in middlewares', async () => {
    const middleware1: Middleware<any, any> = async () => {
      throw new Error('Test error');
    };

    const onError = async () => {
      return 'error handled';
    };

    const composed = compose([middleware1], onError);

    const ctx = await composed({
      output: undefined
    });

    expect(ctx.output).toBe('error handled');
  });

  it('should not call next() multiple times', async () => {
    const middleware1: Middleware<any, any> = async (_ctx, next) => {
      await next();
      await next(); // This should throw an error
    };

    const composed = compose([middleware1]);

    expect(composed({ output: undefined })).rejects.toThrow('next() called multiple times');
  });

  it('should not call next middleware if current middleware does not call next()', async () => {
    const middleware1: Middleware<any, any> = async (ctx, _next) => {
      ctx.output = 'middleware1';
    };

    const middleware2: Middleware<any, any> = async (ctx, _next) => {
      ctx.output += ' middleware2';
    };

    const composed = compose([middleware1, middleware2]);
    const ctx = await composed({ output: undefined });

    expect(ctx.output).toBe('middleware1');
  });
});
