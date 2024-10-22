import { describe, expect, it } from 'bun:test';
import { ApiAction } from '../src/nextjs-action.js';
import { z } from 'zod';

describe('Next.js Action', () => {
  it('create nextjs server action', async () => {
    const aa = new ApiAction({});

    const action = aa
      .post()
      .validator(
        z.object({
          name: z.string(),
        }),
      )
      .action(async ({ input }) => {
        return {
          message: `Hello, ${input.name}`,
        };
      });

    expect(action({ name: 'tom' })).resolves.toEqual({
      message: 'Hello, tom',
    });
  });
});
