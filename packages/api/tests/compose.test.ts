import { describe, it, expect } from 'bun:test';
import { type Middleware, compose } from '../src/compose.js';

describe('compose', () => {
  it('should execute middlewares in order', async () => {
    const middleware1: Middleware<any> = async (opts) => {
      opts.res.output = 'middleware1';
      return opts.next();
    };

    const middleware2: Middleware<any> = async (opts) => {
      opts.res.output += ' middleware2';
      return opts.next();
    };

    const composed = compose([middleware1, middleware2]);
    const ctx = await composed({
      ctx: {},
      res: {
        output: undefined,
        ok: false,
      },
    } as any);

    expect(ctx.res.output).toBe('middleware1 middleware2');
  });

  it('should not call next() multiple times', async () => {
    const middleware1: Middleware<any> = async (opts) => {
      await opts.next();
      await opts.next(); // This should throw an error
    };

    const composed = compose([middleware1]);

    expect(
      composed({
        ctx: {},
      } as any),
    ).rejects.toThrow('next() called multiple times');
  });
});
