import type { AnyRoute } from './router';

export class ApiError extends Error {
  cause?: Error;
  code?: string;
  route?: AnyRoute;

  constructor(message: string, code?: string, route?: AnyRoute) {
    super(message);
    this.code = code;
    this.route = route;
    this.name = 'ApiError';
  }

  static from(messageOrError: unknown, code?: string, route?: AnyRoute) {
    if (messageOrError instanceof Error) {
      const error = new ApiError(messageOrError.message, code, route);
      error.cause = messageOrError;
      return error;
    }
    return new ApiError(messageOrError as string, code, route);
  }

  static readonly ERR_BAD_INPUT = 'ERR_BAD_INPUT';
  static readonly ERR_ACCESS_DENIED = 'ERR_ACCESS_DENIED';
  static readonly ERR_BAD_ROUTE = 'ERR_BAD_ROUTE';
  static readonly ERR_HTTP_ERROR = 'ERR_HTTP_ERROR';
}

export function isApiError(error: Error): error is ApiError {
  return error.name === 'ApiError';
}
