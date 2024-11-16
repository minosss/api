import { describe, expect, it } from 'bun:test';
import { NextRoute } from '../src/next/route.js';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server.js';

describe('Next.js Route', () => {
  it('should be able to create a route', async () => {
    const route = new NextRoute({});

    const GET = route
      .get({ action: 'getUsers' })
      .validator(
        z.object({
          page: z.coerce.number().optional().default(1),
          limit: z.coerce.number().optional().default(10),
        }),
      )
      .action(async ({ req }) => {
        return NextResponse.json({
          users: [],
          page: req.parsedInput.page,
          limit: req.parsedInput.limit,
        });
      });

    const request = new NextRequest('http://localhost:3000/users?limit=20', {
      method: 'GET',
    });

    const response = await GET(request);
    expect(response.ok).toBe(true);
    expect(response.json()).resolves.toEqual({
      users: [],
      page: 1,
      limit: 20,
    });
  });
});
