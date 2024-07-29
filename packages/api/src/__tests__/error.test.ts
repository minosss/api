import { ApiError, isApiError } from '../error';

describe('ApiError', () => {
  test('should create an instance of ApiError', () => {
    const error = new ApiError('Test error');
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('Test error');
    expect(error.code).toBeUndefined();
    expect(error.route).toBeUndefined();
    expect(error.name).toBe('ApiError');
  });

  test('should create an instance of ApiError from another error', () => {
    const cause = new Error('Cause error');
    const error = ApiError.from(cause);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('Cause error');
    expect(error.code).toBeUndefined();
    expect(error.route).toBeUndefined();
    expect(error.name).toBe('ApiError');
    expect(error.cause).toBe(cause);
  });

  test('should create an instance of ApiError from a message', () => {
    const message = 'Test error';
    const error = ApiError.from(message);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe(message);
    expect(error.code).toBeUndefined();
    expect(error.route).toBeUndefined();
    expect(error.name).toBe('ApiError');
  });
});

describe('isApiError', () => {
  test('should return true if the error is an instance of ApiError', () => {
    const error = new ApiError('Test error');
    expect(isApiError(error)).toBe(true);
  });

  test('should return false if the error is not an instance of ApiError', () => {
    const error = new Error('Test error');
    expect(isApiError(error)).toBe(false);
  });
});
