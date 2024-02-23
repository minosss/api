import { vi } from 'vitest';
import { createApi } from '../api';
import { createRouter } from '../router';

const router = createRouter();
const mockHttp = vi.fn();
const mockSuccess = vi.fn();
const mockError = vi.fn();
const mockFinished = vi.fn();
const mockGuard = vi.fn();
const mockOutput = { message: 'Hello, World!' };

const api = createApi({
  http: mockHttp,
  routes: {
    user: {
      list: router.get('/users'),
      update: router.post('/users/:id'),
      one: router
        .get('/users/:id')
        .validator((id: number) => ({ id }))
        .selector((user: { id: number; name: string }) => user.name),
    },
  },
  guard: mockGuard,
  onSuccess: mockSuccess,
  onError: mockError,
  onFinished: mockFinished,
});

beforeEach(() => {
  mockHttp.mockClear();
  mockSuccess.mockClear();
  mockError.mockClear();
  mockFinished.mockClear();
});

describe('createApi', () => {
  test('should create an API client with the provided options', async () => {
    mockGuard.mockResolvedValue(true);
    mockHttp.mockResolvedValue(mockOutput);

    expect(api.user.list).toBeInstanceOf(Function);

    const r = await api.user.list();
    expect(r).toEqual(mockOutput);

    expect(mockSuccess).toBeCalledTimes(1);
    expect(mockSuccess).toHaveBeenCalledWith(mockOutput);
    expect(mockError).not.toBeCalled();
    expect(mockFinished).toBeCalledTimes(1);
    expect(mockFinished).toHaveBeenCalledWith({
      method: 'get',
      url: '/users',
    });
  });

  test('should throw an error if the route definition is not found', async () => {
    mockGuard.mockResolvedValue(true);

    expect((api.user as any).notFound()).rejects.toThrow('Can not found route def.');
    expect(mockHttp).not.toBeCalled();
    expect(mockSuccess).not.toBeCalled();
    expect(mockError).not.toBeCalled();
    expect(mockFinished).not.toBeCalled();
  });

  test('hooks should be called when the request is successful', async () => {
    mockHttp.mockResolvedValue(mockOutput);
    mockGuard.mockResolvedValue(true);

    // get /users
    await expect(api.user.list()).resolves.toBe(mockOutput);

    expect(mockSuccess).toBeCalledTimes(1);
    expect(mockSuccess).toHaveBeenCalledWith(mockOutput);

    expect(mockError).not.toBeCalled();

    expect(mockFinished).toBeCalledTimes(1);
    expect(mockFinished).toHaveBeenCalledWith({
      method: 'get',
      url: '/users',
    });
  });

  test('should replace the route params with the provided values', async () => {
    mockHttp.mockResolvedValue(mockOutput);
    mockGuard.mockResolvedValue(true);

    // post /users
    await expect(api.user.update(123)).resolves.toBe(mockOutput);
    expect(mockHttp).toHaveBeenCalledWith({
      method: 'post',
      url: '/users/123',
      data: undefined,
    });

    await expect(api.user.update({ id: 123 })).resolves.toBe(mockOutput);
    expect(mockHttp).toHaveBeenCalledWith({
      method: 'post',
      url: '/users/123',
      data: undefined,
    });

    expect(mockSuccess).toBeCalledTimes(2);
    expect(mockHttp).toBeCalledTimes(2);
  });

  test('hooks should be called when the request is failed', async () => {
    // mock request error
    mockHttp.mockRejectedValue(new Error('Network Error'));
    mockGuard.mockResolvedValue(true);

    await expect(api.user.list()).rejects.toThrow('Network Error');

    expect(mockError).toBeCalledTimes(1);
    expect(mockFinished).toBeCalledTimes(1);
  });

  test('validator and selector should be works', async () => {
    mockGuard.mockResolvedValue(true);
    // returns mock user
    mockHttp.mockResolvedValue({ id: 123, name: 'John Doe' });
    // request with user id and return user name
    await expect(api.user.one(123)).resolves.toBe('John Doe');
    expect(mockHttp).toHaveBeenCalledWith({
      method: 'get',
      url: '/users/123',
      params: {},
    });
    expect(mockSuccess).toHaveBeenCalledWith('John Doe');
  });

  test('guard should be works', async () => {
    mockHttp.mockResolvedValue(mockOutput);
    mockGuard.mockResolvedValue(false);

    await expect(api.user.list()).rejects.toThrow(`You don't have access to get /users`);
    expect(mockHttp).not.toBeCalled();
    expect(mockSuccess).not.toBeCalled();
    expect(mockError).not.toBeCalled();
    expect(mockFinished).not.toBeCalled();
  });
});
