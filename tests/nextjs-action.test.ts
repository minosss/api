import { describe, expect, it, jest } from 'bun:test';
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

    const formData = new FormData();
    formData.append('name', 'tom');
    expect(action(undefined, formData)).resolves.toEqual({
      message: 'Hello, tom',
    });
  });

  it('create nextjs server action with bindArgs', async () => {
    const aa = new ApiAction({});

    const action = aa
      .post()
      .validator(
        z.object({
          name: z.string(),
        }),
      )
      .bindArgs([z.string()])
      .action(async ({ input, bindArgs }) => {
        return {
          message: `${bindArgs[0]}, ${input.name}`,
        };
      });

    const formData = new FormData();
    formData.append('name', 'tom');
    // NOTE bind args always with state and formData
    expect(action.bind(null, undefined, 'Hi')(formData)).resolves.toEqual({
      message: 'Hi, tom',
    });
  });

  it('create nextjs server action with middleware', async () => {
    const aa = new ApiAction({});
    const middleware = jest.fn(async (c, next) => {
      await next();
    });

    const aa2 = aa.use(middleware);

    const action = aa.post().action(async () => {
      return { message: 'without middleware' };
    });

    const action2 = aa2.post().action(async () => {
      return { message: 'with middleware' };
    });

    expect(action({})).resolves.toEqual({ message: 'without middleware' });
    expect(action2({})).resolves.toEqual({ message: 'with middleware' });
    expect(middleware).toHaveBeenCalledTimes(1);
  });
});
