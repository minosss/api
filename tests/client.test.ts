import { describe, it, expect, jest, beforeEach } from 'bun:test';
import { ApiClient } from '../src/client/index.js';

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
});
