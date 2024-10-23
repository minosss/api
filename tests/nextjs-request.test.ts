import { describe, expect, it, jest } from 'bun:test';
import nmh from 'node-mocks-http';
import { ApiRequest } from '../src/nextjs-request.js';
import type { NextRequest } from 'next/server.js';

describe('Next.js Request', () => {
  it('create nextjs route handler', async () => {
    const ar = new ApiRequest({});

    const req = nmh.createRequest<NextRequest>({
      method: 'GET',
      url: '/hello',
      headers: {
        'content-type': 'application/json',
        'content-length': '0',
      },
    });
    const handler = ar
      .get('/hello', {
        actionName: 'hello',
      })
      .action(async (c) => {
        return { message: `${c.method} ${c.url}` };
      });

    const res = await handler(req);
    expect(res).toBeInstanceOf(Response);
    expect(res.json()).resolves.toEqual({ message: 'GET /hello' });
  });

  it('create nextjs route handler with middleware', async () => {
    const ar = new ApiRequest({});
    const middleware = jest.fn(async (c, next) => {
      await next();
    });
    const ar2 = ar.use(middleware);

    const handler = ar.get('/hello').action(async (c) => {
      return { message: 'without middleware' };
    });
    const handler2 = ar2.get('/hello').action(async (c) => {
      return { message: 'with middleware' };
    });
    const req = nmh.createRequest<NextRequest>({
      method: 'GET',
      url: '/hello',
      headers: {
        'content-type': 'application/json',
        'content-length': '0',
      },
    });
    expect(handler(req)).resolves.toBeInstanceOf(Response);
    expect(handler2(req)).resolves.toBeInstanceOf(Response);
    expect(middleware).toHaveBeenCalledTimes(1);
  });
});
