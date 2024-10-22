import { describe, expect, it } from 'bun:test';
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
});
