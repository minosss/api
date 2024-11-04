export class ApiError extends Error {
  constructor(opts: {
    message: string;
    code: string;
    cause?: unknown;
  }) {
    super(opts.message, { cause: opts.cause });
    this.name = 'ApiError';
  }

  static CODE_BAD_INPUT = 'BAD_INPUT';
  static CODE_BAD_OUTPUT = 'BAD_OUTPUT';
  static CODE_BAD_REQUEST = 'BAD_REQUEST';
}
