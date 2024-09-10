import { describe, it, expect, jest } from "bun:test";
import { refreshToken } from "../src/middleware.js";
import { createApi } from '../src/createApi.js';
import { GenericRequestConfig } from '../src/types.js';

describe("refreshToken", () => {
  it("refresh token", async () => {
    const token = 'new token';
    const refreshTokenFn = jest.fn(async () => {
      return token;
    });

    const httpFn = jest.fn(async (config: GenericRequestConfig & { headers?: Record<string, any> }) => {
      config.headers ??= {};
      if (config.headers['Authorization'] === token) {
        return { data: 'new data' };
      }
      throw new Error('Token expired');
    });

    const api = createApi({
      http: httpFn,
      middlewares: [
        refreshToken({
          refreshTokenFn,
          beforeRetry: (config, token) => {
            config.headers ??= {};
            config.headers['x-retry-by-token'] = '1';
            config.headers["Authorization"] = token;
            return config;
          },
          shouldRefresh: (error: Error) => {
            return error.message === "Token expired";
          },
        })
      ]
    })

    const getUsers = api.get("/users");

    expect(await getUsers()).toEqual({ data: 'new data' });
    expect(httpFn).toHaveBeenCalledTimes(2);
    expect(refreshTokenFn).toHaveBeenCalledTimes(1);
  });
});
