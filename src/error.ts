export class ApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }

  static from(messageOrError: unknown, code?: string) {
    if (messageOrError instanceof Error) {
      const error = new ApiError(messageOrError.message, code);
      error.cause = messageOrError;
      return error;
    }
    return new ApiError(messageOrError as string, code);
  }

  static readonly ERR_BAD_INPUT = 'ERR_BAD_INPUT';
  static readonly ERR_BAD_OUTPUT = 'ERR_BAD_OUTPUT';
  static readonly ERR_BAD_HTTP = 'ERR_BAD_HTTP';
}
