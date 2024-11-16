import { describe, expect, it, jest } from 'bun:test';
import { NextAction } from '../src/next/action.js';
import { z } from 'zod';

describe('Next.js Action', () => {
  it('create nextjs server action', async () => {
    const aa = new NextAction({});

    const action = aa
      .post('/say', { actionName: 'sayHello' })
      .validator(
        z.object({
          name: z.string(),
        }),
      )
      .action(async ({ req }) => {
        // req.actionName
        //     ^type: string
        return {
          actionName: req.actionName,
          message: `Hello, ${req.parsedInput.name}`,
        };
      });

    expect(action({ name: 'tom' })).resolves.toEqual({
      actionName: 'sayHello',
      message: 'Hello, tom',
    });

    const formData = new FormData();
    formData.append('name', 'tom');
    expect(action(formData)).resolves.toEqual({
      actionName: 'sayHello',
      message: 'Hello, tom',
    });
  });

  it('create nextjs server action with bindArgs', async () => {
    const aa = new NextAction({});

    const action = aa
      .post()
      .validator(
        z.object({
          name: z.string(),
        }),
      )
      .bindArgs([z.string()])
      .action(async ({ req }) => {
        return {
          message: `${req.parsedBindArgs[0]}, ${req.parsedInput.name}`,
        };
      });

    const formData = new FormData();
    formData.append('name', 'tom');
    // NOTE bind args always with state and formData
    expect(action.bind(null, 'Hi')(formData)).resolves.toEqual({
      message: 'Hi, tom',
    });
  });

  it('create nextjs server action with middleware', async () => {
    const aa = new NextAction({});
    const middleware = jest.fn(async (opts) => {
      await opts.next();
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

  it('create nextjs server action with selector', async () => {
    const aa = new NextAction({});

    const action = aa
      .post()
      .validator(
        z.object({
          name: z.string(),
        }),
      )
      .action(async ({ req }) => {
        return {
          message: `hello, ${req.parsedInput.name}`,
        };
      });

    const selectName = action.selector((s) => s.message.split(',')[1].trim());

    expect(action({ name: 'tom' })).resolves.toEqual({ message: 'hello, tom' });
    expect(selectName({ name: 'tom' })).resolves.toEqual('tom');
  });
});
