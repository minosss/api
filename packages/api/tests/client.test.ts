import { describe, it, expect, jest, beforeEach } from 'bun:test';
import { ApiClient, replacePathParams } from '../src/client/index.js';
import { z } from 'zod';

describe('ApiClient', () => {
  const action = jest.fn(async (opts) => {
    return { success: true };
  });

  beforeEach(() => {
    action.mockClear();
  });

  it('should create a GET request handler', async () => {
    const apiClient = new ApiClient({
      action,
    });
    const handler = apiClient.get('/test');
    const response = await handler();
    expect(response).toEqual({ success: true });
    expect(action).toHaveBeenCalledTimes(1);
    expect(action.mock.calls[0][0].req).toEqual({
      method: 'GET',
      url: '/test',
      input: undefined,
      parsedInput: undefined,
    });
  });

  it('should create new client when using middleware', async () => {
    const apiClient = new ApiClient({
      action,
    });
    const middleware = jest.fn(async (opts) => {
      await opts.next();
    });

    const clientWithMiddleware = apiClient.use(middleware);

    const handler = apiClient.get('/test');
    const handler2 = clientWithMiddleware.get('/test');

    const response = await handler();
    expect(response).toEqual({ success: true });
    expect(middleware).not.toHaveBeenCalled();
    const response2 = await handler2();
    expect(response2).toEqual({ success: true });
    expect(middleware).toHaveBeenCalledTimes(1);
    expect(action).toBeCalledTimes(2);
  });

  it('create a handler with schema', async () => {
    const apiClient = new ApiClient({
      action,
    });

    const validateInput = apiClient.get('/test').validator(
      z.object({
        name: z.string().min(1),
      }),
    );

    const changeOutput = validateInput.selector((out) => {
      return out ? 'success' : 'fail';
    });

    expect(validateInput({ name: '' })).rejects.toThrowError(
      'The input is not valid.',
    );
    expect(validateInput({ name: 'test' })).resolves.toEqual({ success: true });
    expect(changeOutput({ name: 'test' })).resolves.toEqual('success');

    // define Type does not change the action
    const defineOutput = validateInput.T<{ success: boolean }>();
    expect(defineOutput({ name: 'test' })).resolves.toEqual({ success: true });
  });

  it('use client middleware with replacePathParams', async () => {
    const apiClient = new ApiClient({
      action,
      middlewares: [
        replacePathParams({
          // Remove path params from the url, true by default
          // excludePathParams: true
        }),
      ],
    });

    await apiClient.get('/test/[id]')({ id: '123' });
    expect(action).toHaveBeenCalledTimes(1);
    expect(action.mock.calls[0][0].req).toEqual({
      method: 'GET',
      rawUrl: '/test/[id]',
      url: '/test/123',
      input: {},
      parsedInput: undefined,
    });
  });
});
