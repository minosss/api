import { describe, it, expect, jest, beforeEach } from 'bun:test';
import { ApiClient } from '../src/api.js';

describe('ApiClient', () => {
  const action = jest.fn(
    async (_config, _context) => {
      return { success: true };
    },
  );

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
    expect(action.mock.calls[0][0]).toEqual({
      method: 'GET',
      url: '/test',
      input: undefined,
    });
  });

  it('should create new client when using middleware', async () => {
    const apiClient = new ApiClient({
      action,
    });
    const middleware = jest.fn(async (context, next) => {
      context.modified = true;
      await next();
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

  it('should catch error when using onError', async () => {
    action.mockRejectedValueOnce(new Error('Test error'));
    const apiClient = new ApiClient({
      action,
      onError: async () => {
        return 'error';
      }
    });

    const handler = apiClient.get('/test');
    const response = await handler();
    expect(response).toEqual('error');
    expect(action).toBeCalledTimes(1);
  });

  it('custom deep config', async () => {
    const apiClient = new ApiClient({
      action,
      mergeConfig: (target: any, source: any) => {
        return {
          ...target,
          ...source,
          headers: {
            ...target.headers,
            ...source.headers,
          }
        }
      },
    });

    const handler = apiClient.get('/test', { headers: { 'x-api-key': '123' } });
    await handler(void 0, { headers: { 'x-api-key': '456' } });
    expect(action.mock.calls[0][0]).toEqual({
      method: 'GET',
      url: '/test',
      input: undefined,
      headers: {
        'x-api-key': '456',
      }
    });
  })
});
