import { NextAction } from '@yme/api/next/action';
import { logger } from '@yme/api/middleware';
import { ZodError } from 'zod';
import { ApiError } from '@yme/api';

export const action = new NextAction({
  middlewares: [logger()],
  handleError: async (error) => {
    if (error instanceof ApiError) {
      if (error.cause instanceof ZodError) {
        return {
          message: error.cause.errors[0].message,
          code: error.code,
        };
      }
      return {
        message: error.message,
        code: error.code,
      };
    }
    return {
      message: 'Something went wrong',
      code: 500,
    };
  },
});
